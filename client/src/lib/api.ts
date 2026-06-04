import type { Contact, Opportunity, Notification, GmailStatus, User, Suggestion, PendingResponse } from '../types'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

async function req<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...opts?.headers },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: 'Request failed' }))
    throw new Error(err.message || `Request failed: ${res.status}`)
  }
  return res.json()
}

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    req<{ user: User }>('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  register: (email: string, password: string, name: string) =>
    req<{ user: User }>('/api/auth/register', { method: 'POST', body: JSON.stringify({ email, password, name }) }),
  logout: () => req<{ message: string }>('/api/auth/logout', { method: 'POST' }),
  me: () => req<{ user: User }>('/api/auth/me'),
}

// Contacts
export const contactsApi = {
  list: () => req<Contact[]>('/api/contacts'),
  get: (id: number) => req<Contact>(`/api/contacts/${id}`),
  create: (data: Partial<Contact>) =>
    req<Contact>('/api/contacts', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Contact>) =>
    req<Contact>(`/api/contacts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => req<{ message: string }>(`/api/contacts/${id}`, { method: 'DELETE' }),
  talked: (id: number) => req<Contact>(`/api/contacts/${id}/talked`, { method: 'PUT' }),
  suggestions: () => req<Suggestion[]>('/api/contacts/suggestions'),
}

// Opportunities
export const oppsApi = {
  list: () => req<Opportunity[]>('/api/opportunities'),
  create: (data: Partial<Opportunity>) =>
    req<Opportunity>('/api/opportunities', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: Partial<Opportunity>) =>
    req<Opportunity>(`/api/opportunities/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => req<{ message: string }>(`/api/opportunities/${id}`, { method: 'DELETE' }),
}

// Notifications
export const notifApi = {
  list: () => req<Notification[]>('/api/notifications'),
  markRead: (id: number) => req<{ message: string }>(`/api/notifications/${id}/read`, { method: 'PUT' }),
  markAllRead: () => req<{ message: string }>('/api/notifications/read-all', { method: 'PUT' }),
  delete: (id: number) => req<{ message: string }>(`/api/notifications/${id}`, { method: 'DELETE' }),
}

// Gmail
export const gmailApi = {
  status: () => req<GmailStatus>('/api/gmail/status'),
  sync: () => req<{ success: boolean; message: string }>('/api/gmail/sync', { method: 'POST' }),
  recent: () => req<unknown[]>('/api/gmail/recent'),
}

// AI Draft
export const draftApi = {
  generate: (contactId: number, pendingResponseId?: number) =>
    req<{ draft: string }>('/api/draft', { method: 'POST', body: JSON.stringify({ contactId, pendingResponseId }) }),
}

// Pending Responses (Awaiting Reply feature)
export const pendingApi = {
  list: () => req<PendingResponse[]>('/api/contacts/pending-responses'),
  dismiss: (id: number) => req<{ message: string }>(`/api/pending-responses/${id}/dismiss`, { method: 'PUT' }),
  markResponded: (id: number) => req<{ message: string }>(`/api/pending-responses/${id}/responded`, { method: 'PUT' }),
}
