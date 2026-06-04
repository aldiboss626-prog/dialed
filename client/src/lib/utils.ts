export const starToCadence: Record<number, number> = { 5: 5, 4: 10, 3: 14, 2: 21, 1: 30 }

export function computeStatus(lastContactDate: string, cadenceDays: number): 'overdue' | 'due-soon' | 'good' {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const last = new Date(lastContactDate)
  last.setHours(0, 0, 0, 0)
  const days = Math.floor((today.getTime() - last.getTime()) / 86400000)
  if (days > cadenceDays) return 'overdue'
  if (days > cadenceDays - 3) return 'due-soon'
  return 'good'
}

export function computeOpportunityState(deadline: string | null, status: string): 'overdue' | 'upcoming' | 'active' | 'completed' {
  if (status === 'Completed') return 'completed'
  if (!deadline) return 'active'
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dl = new Date(deadline)
  dl.setHours(0, 0, 0, 0)
  const diff = Math.ceil((dl.getTime() - today.getTime()) / 86400000)
  if (diff < 0) return 'overdue'
  if (diff <= 7) return 'upcoming'
  return 'active'
}

export function daysSince(date: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return Math.floor((today.getTime() - d.getTime()) / 86400000)
}

export function daysUntil(date: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return Math.ceil((d.getTime() - today.getTime()) / 86400000)
}

export function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning,'
  if (h < 17) return 'Good afternoon,'
  return 'Good evening,'
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatDateShort(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function initials(name: string): string {
  return name
    .split(' ')
    .map(p => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export const statusColor = {
  overdue: '#E05252',
  'due-soon': '#D4852A',
  good: '#5BA882',
} as const

export const statusLabel = {
  overdue: 'OVERDUE',
  'due-soon': 'DUE SOON',
  good: 'GOOD',
} as const
