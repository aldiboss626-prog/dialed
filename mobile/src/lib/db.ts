import { supabase } from './supabase'
import { withCache, clearCache } from './cache'
import type { Contact, Opportunity, Notification, PendingResponse, Group, Tag } from '@/types'

// ── Computed fields ───────────────────────────────────────────────────────────

const STAR_TO_CADENCE: Record<number, number> = { 5: 5, 4: 10, 3: 14, 2: 21, 1: 30 }

function computeContact(raw: any): Contact {
  // Prefer the value stored in the DB (custom cadence); fall back to star default only if absent
  const cadence_days = raw.cadence_days ?? STAR_TO_CADENCE[raw.stars] ?? 14
  const days_since_contact = Math.floor(
    (Date.now() - new Date(raw.last_contact_date).getTime()) / 86_400_000,
  )
  const status: Contact['status'] =
    days_since_contact > cadence_days ? 'overdue'
    : days_since_contact > cadence_days - 3 ? 'due-soon'
    : 'good'
  return { ...raw, cadence_days, days_since_contact, status }
}

function computeOpp(raw: any): Opportunity {
  const daysLeft = raw.deadline
    ? Math.ceil((new Date(raw.deadline).getTime() - Date.now()) / 86_400_000)
    : null
  const state: Opportunity['state'] =
    raw.status === 'Completed' || raw.status === 'Missed' ? 'completed'
    : daysLeft !== null && daysLeft < 0 ? 'overdue'
    : daysLeft !== null && daysLeft <= 14 ? 'upcoming'
    : 'active'
  return { ...raw, days_left: daysLeft, state }
}

async function getUid(): Promise<string> {
  const { data } = await supabase.auth.getUser()
  if (!data.user) throw new Error('Not authenticated — please log in again.')
  return data.user.id
}

// ── Sent replies (personalization — the AI draft learns the user's voice) ───────
// Every reply the user actually sends is saved here; the most recent ones are fed
// back into /api/content/draft-reply as writing samples so drafts sound like them.

export const sentRepliesDb = {
  // Most recent reply texts for the current user (RLS scopes to them automatically).
  recent: async (limit = 5): Promise<string[]> => {
    const { data, error } = await supabase
      .from('sent_replies')
      .select('reply_text')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) return [] // table may not exist yet / offline — personalization is best-effort
    return (data ?? []).map(r => r.reply_text).filter((t): t is string => !!t)
  },

  create: async (fields: { reply_text: string; subject?: string | null; contact_id?: number | null }): Promise<void> => {
    const userId = await getUid()
    const { error } = await supabase.from('sent_replies').insert({
      user_id: userId,
      reply_text: fields.reply_text,
      subject: fields.subject ?? null,
      contact_id: fields.contact_id ?? null,
    })
    if (error) throw new Error(error.message)
  },
}

// ── Contacts ──────────────────────────────────────────────────────────────────

export const contactsDb = {
  list: async (onUpdate?: (data: Contact[]) => void): Promise<Contact[]> => {
    return withCache('contacts', async () => {
      const { data, error } = await supabase
        .from('contacts')
        .select('*, linked_opportunity:opportunities(id,title,deadline,status)')
        .order('created_at', { ascending: false })
      if (error) throw new Error(error.message)
      return (data ?? []).map(c => {
        const opp = Array.isArray(c.linked_opportunity) ? c.linked_opportunity[0] : null
        return computeContact({ ...c, linked_opportunity: opp ?? null })
      })
    }, onUpdate)
  },

  get: async (id: number): Promise<Contact> => {
    const { data, error } = await supabase
      .from('contacts')
      .select('*, email_threads(*), interactions(*), opportunities(*), pending_response:pending_responses(*)')
      .eq('id', id)
      .single()
    if (error) throw new Error(error.message)
    const pr = Array.isArray(data.pending_response) ? data.pending_response[0] : null
    return computeContact({ ...data, pending_response: pr ?? null })
  },

  create: async (fields: Partial<Contact>): Promise<Contact> => {
    const userId = await getUid()
    const stars = fields.stars ?? 3
    const { data, error } = await supabase
      .from('contacts')
      .insert({ ...fields, user_id: userId, cadence_days: STAR_TO_CADENCE[stars] ?? 14 })
      .select()
      .single()
    if (error) throw new Error(error.message)
    await clearCache('contacts')
    await clearCache('pending')
    return computeContact(data)
  },

  update: async (id: number, fields: Partial<Contact>): Promise<Contact> => {
    const stars = fields.stars
    const extra = stars ? { cadence_days: STAR_TO_CADENCE[stars] ?? 14 } : {}
    const { data, error } = await supabase
      .from('contacts')
      .update({ ...fields, ...extra })
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    await clearCache('contacts')
    return computeContact(data)
  },

  delete: async (id: number): Promise<void> => {
    const { error } = await supabase.from('contacts').delete().eq('id', id)
    if (error) throw new Error(error.message)
    await clearCache('contacts')
  },

  bulkCreate: async (contacts: Partial<Contact>[]): Promise<Contact[]> => {
    const userId = await getUid()
    const rows = contacts.map(f => ({
      ...f,
      user_id: userId,
      cadence_days: STAR_TO_CADENCE[f.stars ?? 3] ?? 14,
    }))
    const { data, error } = await supabase
      .from('contacts')
      .insert(rows)
      .select()
    if (error) throw new Error(error.message)
    await clearCache('contacts')
    await clearCache('pending')
    return (data ?? []).map(computeContact)
  },

  talked: async (id: number): Promise<Contact> => {
    const today = new Date().toISOString().slice(0, 10)
    const userId = await getUid()
    const { data, error } = await supabase
      .from('contacts')
      .update({ last_contact_date: today })
      .eq('id', id)
      .select()
      .single()
    if (error) throw new Error(error.message)
    await supabase.from('interactions').insert({ contact_id: id, user_id: userId, date: today, type: 'call' })
    await supabase.from('pending_responses').update({ status: 'responded' }).eq('contact_id', id).eq('status', 'pending')
    await clearCache('contacts')
    await clearCache('pending')
    return computeContact(data)
  },

  // Manually log a history note about this contact (appears in the relationship timeline).
  addNote: async (id: number, note: string): Promise<void> => {
    const userId = await getUid()
    const { error } = await supabase.from('interactions').insert({
      contact_id: id, user_id: userId, date: new Date().toISOString().slice(0, 10), type: 'note', note: note.trim(),
    })
    if (error) throw new Error(error.message)
    await clearCache('contacts')
  },
}

// ── Opportunities ─────────────────────────────────────────────────────────────

export const oppsDb = {
  list: async (onUpdate?: (data: Opportunity[]) => void): Promise<Opportunity[]> => {
    return withCache('opportunities', async () => {
      const { data, error } = await supabase
        .from('opportunities')
        .select('*, contact:contacts(id,name,stars,role)')
        .order('created_at', { ascending: false })
      if (error) throw new Error(error.message)
      return (data ?? []).map(computeOpp)
    }, onUpdate)
  },

  create: async (fields: Partial<Opportunity>): Promise<Opportunity> => {
    const userId = await getUid()
    const base: any = {
      title: fields.title,
      user_id: userId,
      status: fields.status ?? 'Active',
    }
    if (fields.contact_id) base.contact_id = fields.contact_id
    if (fields.deadline) base.deadline = fields.deadline
    if (fields.notes) base.notes = fields.notes

    // Try with new columns first, fall back without them if schema not migrated
    let result = await supabase
      .from('opportunities')
      .insert({ ...base, ...(fields.priority ? { priority: fields.priority } : {}), ...(fields.category ? { category: fields.category } : {}) })
      .select('*, contact:contacts(id,name,stars,role)')
      .single()

    if (result.error && result.error.message.includes('column')) {
      result = await supabase
        .from('opportunities')
        .insert(base)
        .select('*, contact:contacts(id,name,stars,role)')
        .single()
    }

    if (result.error) throw new Error(result.error.message)
    await clearCache('opportunities')
    return computeOpp(result.data)
  },

  update: async (id: number, fields: Partial<Opportunity>): Promise<Opportunity> => {
    const update: any = {}
    if (fields.title !== undefined) update.title = fields.title
    if (fields.status !== undefined) update.status = fields.status
    if (fields.deadline !== undefined) update.deadline = fields.deadline
    if (fields.contact_id !== undefined) update.contact_id = fields.contact_id
    if (fields.notes !== undefined) update.notes = fields.notes
    if (fields.priority !== undefined) update.priority = fields.priority
    if (fields.category !== undefined) update.category = fields.category

    let result = await supabase
      .from('opportunities')
      .update(update)
      .eq('id', id)
      .select('*, contact:contacts(id,name,stars,role)')
      .single()

    if (result.error && result.error.message.includes('column')) {
      const { priority: _p, category: _c, ...safe } = update
      result = await supabase
        .from('opportunities')
        .update(safe)
        .eq('id', id)
        .select('*, contact:contacts(id,name,stars,role)')
        .single()
    }

    if (result.error) throw new Error(result.error.message)
    await clearCache('opportunities')
    return computeOpp(result.data)
  },

  delete: async (id: number): Promise<void> => {
    const { error } = await supabase.from('opportunities').delete().eq('id', id)
    if (error) throw new Error(error.message)
    await clearCache('opportunities')
  },
}

// ── Notifications ─────────────────────────────────────────────────────────────

export const notifDb = {
  list: async (onUpdate?: (data: Notification[]) => void): Promise<Notification[]> => {
    return withCache('notifications', async () => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*, contact:contacts(id,name,stars,role)')
        .order('created_at', { ascending: false })
      if (error) throw new Error(error.message)
      return (data ?? []) as Notification[]
    }, onUpdate)
  },

  markAllRead: async (): Promise<void> => {
    const userId = await getUid()
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId)
    await clearCache('notifications')
  },

  markRead: async (id: number): Promise<void> => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id)
    await clearCache('notifications')
  },

  delete: async (id: number): Promise<void> => {
    await supabase.from('notifications').delete().eq('id', id)
    await clearCache('notifications')
  },
}

// ── Pending responses ─────────────────────────────────────────────────────────

export const pendingDb = {
  list: async (onUpdate?: (data: PendingResponse[]) => void): Promise<PendingResponse[]> => {
    return withCache('pending', async () => {
      const { data, error } = await supabase
        .from('pending_responses')
        .select('*, contact:contacts(id,name,stars,role,relationship_type,email), email_thread:email_threads(subject,date,preview,body)')
        .eq('status', 'pending')
        .order('detected_at', { ascending: false })
      if (error) throw new Error(error.message)
      return (data ?? []).map(pr => ({
        ...pr,
        email_subject: (pr.email_thread as any)?.subject ?? '(no subject)',
        email_date: (pr.email_thread as any)?.date ?? pr.detected_at,
        email_preview: (pr.email_thread as any)?.preview ?? null,
        email_body: (pr.email_thread as any)?.body ?? null,
      })) as PendingResponse[]
    }, onUpdate)
  },

  dismiss: async (id: number): Promise<void> => {
    await supabase.from('pending_responses').update({ status: 'dismissed' }).eq('id', id)
    await clearCache('pending')
  },

  responded: async (id: number): Promise<void> => {
    await supabase.from('pending_responses').update({ status: 'responded' }).eq('id', id)
    await clearCache('pending')
  },
}

// ── Tracker ───────────────────────────────────────────────────────────────────

export async function getTrackerData() {
  const contacts = await contactsDb.list()
  const overdue = contacts.filter(c => c.status === 'overdue').length
  const dueSoon = contacts.filter(c => c.status === 'due-soon').length
  const orbitScore = Math.max(0, Math.min(100, 100 - overdue * 12 - dueSoon * 5))

  return {
    orbitScore,
    scoreBreakdown: { overdue, dueSoon, awaiting: 0, recentInteractions: 0 },
    streakCount: 0,
    topRelationships: [...contacts]
      .sort((a, b) => b.stars - a.stars || a.days_since_contact - b.days_since_contact)
      .slice(0, 3)
      .map((c, i) => ({ id: c.id, name: c.name, role: c.role, stars: c.stars, interactions30: 0, emails30: 0, score: (5 - i) * 20 })),
    activeDays: 0,
    totalTouchpoints: 0,
    mostNeglected: [...contacts]
      .filter(c => c.status === 'overdue')
      .sort((a, b) => b.days_since_contact - a.days_since_contact)
      .slice(0, 3)
      .map(c => ({ id: c.id, name: c.name, role: c.role, stars: c.stars, days_since_contact: c.days_since_contact, cadence_days: c.cadence_days, overdue_days: c.days_since_contact - c.cadence_days })),
    responseRate: { responded: 0, total: 0, percent: null as number | null },
  }
}

// ── Groups ────────────────────────────────────────────────────────────────────

export const groupsDb = {
  list: async (): Promise<Group[]> => {
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .order('name')
    if (error) throw new Error(error.message)
    return (data ?? []) as Group[]
  },

  create: async (name: string): Promise<Group> => {
    const userId = await getUid()
    const { data, error } = await supabase
      .from('groups')
      .insert({ name: name.trim(), user_id: userId })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data as Group
  },

  delete: async (id: number): Promise<void> => {
    const { error } = await supabase.from('groups').delete().eq('id', id)
    if (error) throw new Error(error.message)
  },

  setContactGroups: async (contactId: number, groupIds: number[]): Promise<void> => {
    await supabase.from('contact_groups').delete().eq('contact_id', contactId)
    if (groupIds.length > 0) {
      const rows = groupIds.map(group_id => ({ contact_id: contactId, group_id }))
      const { error } = await supabase.from('contact_groups').insert(rows)
      if (error) throw new Error(error.message)
    }
    await clearCache('contacts')
  },

  getContactGroups: async (contactId: number): Promise<Group[]> => {
    const { data, error } = await supabase
      .from('contact_groups')
      .select('group:groups(*)')
      .eq('contact_id', contactId)
    if (error) throw new Error(error.message)
    return (data ?? []).map((r: any) => r.group).filter(Boolean) as Group[]
  },
}

// ── Tags ──────────────────────────────────────────────────────────────────────

export const tagsDb = {
  list: async (): Promise<Tag[]> => {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .order('name')
    if (error) throw new Error(error.message)
    return (data ?? []) as Tag[]
  },

  create: async (name: string): Promise<Tag> => {
    const userId = await getUid()
    const { data, error } = await supabase
      .from('tags')
      .insert({ name: name.trim(), user_id: userId })
      .select()
      .single()
    if (error) throw new Error(error.message)
    return data as Tag
  },

  setContactTags: async (contactId: number, tagIds: number[]): Promise<void> => {
    await supabase.from('contact_tags').delete().eq('contact_id', contactId)
    if (tagIds.length > 0) {
      const rows = tagIds.map(tag_id => ({ contact_id: contactId, tag_id }))
      const { error } = await supabase.from('contact_tags').insert(rows)
      if (error) throw new Error(error.message)
    }
    await clearCache('contacts')
  },

  getContactTags: async (contactId: number): Promise<Tag[]> => {
    const { data, error } = await supabase
      .from('contact_tags')
      .select('tag:tags(*)')
      .eq('contact_id', contactId)
    if (error) throw new Error(error.message)
    return (data ?? []).map((r: any) => r.tag).filter(Boolean) as Tag[]
  },
}

// ── Favorites ─────────────────────────────────────────────────────────────────

export async function toggleFavorite(id: number, current: boolean): Promise<void> {
  const { error } = await supabase
    .from('contacts')
    .update({ is_favorite: !current })
    .eq('id', id)
  if (error) throw new Error(error.message)
  await clearCache('contacts')
}

// ── Avatar upload ─────────────────────────────────────────────────────────────

export async function uploadAvatar(contactId: number, imageUri: string, base64Data?: string): Promise<string> {
  const userId = await getUid()
  const ext = imageUri.toLowerCase().includes('.png') ? 'png' : 'jpg'
  const path = `${userId}/${contactId}.${ext}`

  // Use base64 decode — more reliable in React Native than fetch→blob
  let uploadPayload: Uint8Array | Blob
  if (base64Data) {
    const binary = atob(base64Data)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    uploadPayload = bytes
  } else {
    uploadPayload = await fetch(imageUri).then(r => r.blob())
  }

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, uploadPayload, { upsert: true, contentType: ext === 'png' ? 'image/png' : 'image/jpeg' })
  if (uploadError) throw new Error(`Storage: ${uploadError.message}`)

  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  const avatarUrl = `${data.publicUrl}?t=${Date.now()}`

  const { error: updateError } = await supabase
    .from('contacts')
    .update({ avatar_url: avatarUrl })
    .eq('id', contactId)
  if (updateError) throw new Error(`DB: ${updateError.message}`)

  await clearCache('contacts')
  return avatarUrl
}

export { clearCache }
