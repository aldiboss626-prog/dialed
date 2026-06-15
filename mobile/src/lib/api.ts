import Constants from 'expo-constants'
import * as ExpoContacts from 'expo-contacts'
import { getItem } from '@/lib/storage'
import type {
  Contact, Opportunity, Notification, PendingResponse, GmailStatus, User, ImportCandidate,
} from '@/types'

export const TOKEN_KEY = 'dialed_jwt'

// Derive the Express server URL from Expo Go's Metro bundler host.
// On a physical device, Constants.expoConfig.hostUri is "192.168.x.x:8081".
// We strip the port and point at :3001 where our server runs.
export function getApiUrl(): string {
  if (__DEV__) {
    const hostUri = Constants.expoConfig?.hostUri ?? ''
    const host = hostUri.split(':')[0]
    if (host) return `http://${host}:3001`
    // Android emulator fallback
    return 'http://10.0.2.2:3001'
  }
  return 'http://localhost:3001'
}

async function req<T>(
  method: string,
  path: string,
  body?: object,
): Promise<T> {
  const token = await getItem(TOKEN_KEY)
  const res = await fetch(`${getApiUrl()}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { message?: string }
    throw new Error(err.message ?? `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

export const authApi = {
  login: (email: string, password: string) =>
    req<{ user: User; token: string }>('POST', '/auth/login', { email, password }),
  register: (email: string, password: string, name: string) =>
    req<{ user: User; token: string }>('POST', '/auth/register', { email, password, name }),
  me: () => req<{ user: User }>('GET', '/auth/me'),
}

export const contactsApi = {
  list: () => req<Contact[]>('GET', '/contacts'),
  get: (id: number) => req<Contact>('GET', `/contacts/${id}`),
  create: (data: Partial<Contact>) => req<Contact>('POST', '/contacts', data),
  update: (id: number, data: Partial<Contact>) => req<Contact>('PUT', `/contacts/${id}`, data),
  delete: (id: number) => req<void>('DELETE', `/contacts/${id}`),
  talked: (id: number) => req<Contact>('PUT', `/contacts/${id}/talked`),
}

export const oppsApi = {
  list: () => req<Opportunity[]>('GET', '/opportunities'),
  create: (data: Partial<Opportunity>) => req<Opportunity>('POST', '/opportunities', data),
  update: (id: number, data: Partial<Opportunity>) =>
    req<Opportunity>('PUT', `/opportunities/${id}`, data),
  delete: (id: number) => req<void>('DELETE', `/opportunities/${id}`),
}

export const notifApi = {
  list: () => req<Notification[]>('GET', '/notifications'),
  markAllRead: () => req<void>('PUT', '/notifications/read-all'),
  markRead: (id: number) => req<void>('PUT', `/notifications/${id}/read`),
  delete: (id: number) => req<void>('DELETE', `/notifications/${id}`),
}

export const pendingApi = {
  list: () => req<PendingResponse[]>('GET', '/contacts/pending-responses'),
  dismiss: (id: number) => req<void>('PUT', `/pending-responses/${id}/dismiss`),
  responded: (id: number) => req<void>('PUT', `/pending-responses/${id}/responded`),
}

export const gmailApi = {
  status: () => req<GmailStatus>('GET', '/gmail/status'),
  sync: () => req<void>('POST', '/gmail/sync'),
  contacts: (existingEmails: string[]) =>
    req<ImportCandidate[]>('GET', `/gmail/contacts?existingEmails=${existingEmails.join(',')}`),
}

export async function loadPhoneContacts(existingEmails: string[]): Promise<ImportCandidate[]> {
  const { status } = await ExpoContacts.requestPermissionsAsync()
  if ((status as string) === 'limited') throw new Error('LIMITED_ACCESS')
  if (status !== 'granted') throw new Error('Permission denied — allow contacts access in Settings.')
  const { data } = await ExpoContacts.getContactsAsync({
    fields: [
      ExpoContacts.Fields.Name,
      ExpoContacts.Fields.Emails,
      ExpoContacts.Fields.PhoneNumbers,
      ExpoContacts.Fields.JobTitle,
      ExpoContacts.Fields.Company,
    ],
  })
  const existing = new Set(existingEmails.map(e => e.toLowerCase()))
  const results: ImportCandidate[] = []
  for (const c of data) {
    const name = c.name ?? ''
    if (!name) continue
    const email = c.emails?.[0]?.email
    const phone = c.phoneNumbers?.[0]?.number
    const role = [c.jobTitle, c.company].filter(Boolean).join(' · ') || undefined
    const alreadyExists = email ? existing.has(email.toLowerCase()) : false
    results.push({ name, email, phone, role, alreadyExists })
  }
  return results.sort((a, b) => a.name.localeCompare(b.name))
}

export const draftApi = {
  generate: (contactId: number, pendingResponseId?: number) =>
    req<{ draft: string }>('POST', '/draft', { contactId, pendingResponseId }),
}
