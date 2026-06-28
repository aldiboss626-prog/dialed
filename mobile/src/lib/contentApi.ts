import { getApiUrl } from './api'
import { supabase } from './supabase'

// Auth + JSON headers for every AI content endpoint. Attaches the Supabase access
// token so the server can verify the user — the /api/content/* routes are gated to
// logged-in users and rate-limited per user to protect the API budget.
export async function contentHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export interface Challenge {
  challenge: string
  description: string
  action: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
}

export interface Article {
  title: string
  intro: string
  body: string
  practicalTip: string
  readMinutes: number
}

export type ArticleTopic =
  | 'networking-101'
  | 'workplace-etiquette'
  | 'coffee-dates'
  | 'career-exposure'
  | 'dealing-with-authority'
  | 'linkedin-tips'

// Permanently delete the signed-in user + all their data (server uses the admin API +
// ON DELETE CASCADE). Caller should sign out + route to login on success.
export async function deleteAccount(): Promise<void> {
  const res = await fetch(`${getApiUrl()}/api/account`, {
    method: 'DELETE',
    headers: await contentHeaders(),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { message?: string }
    throw new Error(body.message ?? 'Could not delete account.')
  }
}

export async function generateChallenge(stats: {
  overdue: number
  dueSoon: number
  totalContacts: number
  topContactName?: string
}): Promise<Challenge> {
  const res = await fetch(`${getApiUrl()}/api/content/challenge`, {
    method: 'POST',
    headers: await contentHeaders(),
    body: JSON.stringify(stats),
  })
  if (!res.ok) throw new Error('Failed to generate challenge')
  return res.json()
}

export async function generateArticle(topic: ArticleTopic, title?: string): Promise<Article> {
  const res = await fetch(`${getApiUrl()}/api/content/article`, {
    method: 'POST',
    headers: await contentHeaders(),
    body: JSON.stringify({ topic, title }),
  })
  if (!res.ok) throw new Error('Failed to generate article')
  return res.json()
}

export type ReplyIntent = 'professional' | 'accept' | 'decline' | 'details'

export interface DraftedReply {
  subject: string
  reply: string
}

export async function generateReply(input: {
  emailText?: string
  imageBase64?: string
  contactName?: string
  contactRole?: string
  relationship?: string
  senderName?: string
  intent: ReplyIntent
  /** The user's own recent sent replies — used so the draft learns their voice over time. */
  styleExamples?: string[]
}): Promise<DraftedReply> {
  const res = await fetch(`${getApiUrl()}/api/content/draft-reply`, {
    method: 'POST',
    headers: await contentHeaders(),
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error('Failed to draft reply')
  return res.json()
}

export interface ScannedCard {
  name: string
  title: string
  company: string
  email: string
  phone: string
}

// Read a business card photo (base64 JPEG) and extract contact fields via Claude vision.
// Empty strings come back for anything not found on the card.
export async function scanBusinessCard(imageBase64: string): Promise<ScannedCard> {
  const res = await fetch(`${getApiUrl()}/api/content/scan-card`, {
    method: 'POST',
    headers: await contentHeaders(),
    body: JSON.stringify({ imageBase64 }),
  })
  if (!res.ok) throw new Error('Failed to scan card')
  return res.json()
}
