import { getApiUrl } from './api'

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

export async function generateChallenge(stats: {
  overdue: number
  dueSoon: number
  totalContacts: number
  topContactName?: string
}): Promise<Challenge> {
  const res = await fetch(`${getApiUrl()}/api/content/challenge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(stats),
  })
  if (!res.ok) throw new Error('Failed to generate challenge')
  return res.json()
}

export async function generateArticle(topic: ArticleTopic, title?: string): Promise<Article> {
  const res = await fetch(`${getApiUrl()}/api/content/article`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
}): Promise<DraftedReply> {
  const res = await fetch(`${getApiUrl()}/api/content/draft-reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error('Failed to draft reply')
  return res.json()
}
