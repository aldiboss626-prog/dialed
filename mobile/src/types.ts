export interface User {
  id: string   // UUID from Supabase Auth
  email: string
  name: string
  tier: 'free' | 'pro'
}

export interface LinkedOpportunity {
  id: number
  title: string
  deadline: string | null
  status: string
}

export interface Group {
  id: number
  user_id: string
  name: string
  created_at: string
}

export interface Tag {
  id: number
  user_id: string
  name: string
  created_at: string
}

export interface Contact {
  id: number
  user_id: number
  name: string
  role: string | null          // company name
  position?: string | null     // job title
  relationship_type: string | null
  email: string | null
  phone?: string | null
  location?: string | null
  linkedin?: string | null
  birthday?: string | null
  is_favorite?: boolean
  avatar_url?: string | null
  stars: number
  cadence_days: number
  last_contact_date: string
  notes: string | null
  gmail_connected: number
  created_at: string
  status: 'overdue' | 'due-soon' | 'good'
  days_since_contact: number
  linked_opportunity: LinkedOpportunity | null
  email_threads?: EmailThread[]
  interactions?: Interaction[]
  opportunities?: Opportunity[]
  pending_response?: PendingResponse | null
  groups?: Group[]
  tags?: Tag[]
}

export interface Interaction {
  id: number
  contact_id: number
  user_id: number
  date: string
  note: string | null
  type: 'email' | 'call' | 'message' | 'meeting'
  created_at: string
}

export interface Opportunity {
  id: number
  user_id: number
  contact_id: number | null
  title: string
  status: 'Not Started' | 'Applied' | 'Interview' | 'Active' | 'Waiting' | 'Completed' | 'Missed'
  priority?: 'Low' | 'Medium' | 'High' | null
  category?: string | null
  deadline: string | null
  notes: string | null
  created_at: string
  state: 'overdue' | 'upcoming' | 'active' | 'completed'
  days_left: number | null
  contact: { id: number; name: string; stars: number; role: string | null } | null
}

export interface EmailThread {
  id: number
  contact_id: number
  user_id: number
  subject: string
  sender: string
  recipient: string
  date: string
  preview: string | null
  body: string | null
  is_from_user: number
}

export interface Notification {
  id: number
  user_id: number
  contact_id: number | null
  opportunity_id: number | null
  type: 'urgent' | 'deadline' | 'cadence' | 'positive' | 'awaiting_reply'
  title: string
  body: string
  is_read: number
  created_at: string
  contact: { id: number; name: string; stars: number; role: string | null } | null
}

export interface PendingResponse {
  id: number
  contact_id: number
  email_thread_id: number
  detected_at: string
  stars_at_detection: number
  last_notified_at: string | null
  notification_count: number
  status: 'pending' | 'responded' | 'dismissed'
  created_at: string
  contact: { id: number; name: string; stars: number; role: string | null; relationship_type?: string | null; email?: string | null }
  email_subject: string
  email_date: string
  email_preview: string | null
  email_body: string | null
}

export interface GmailStatus {
  connected: boolean
  email: string
  lastSynced: string
}

export interface ImportCandidate {
  name: string
  email?: string
  phone?: string
  role?: string
  alreadyExists?: boolean
}
