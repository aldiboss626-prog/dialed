import AsyncStorage from '@react-native-async-storage/async-storage'
import type { ColorPalette } from '@/hooks/use-theme'

// How long an email may sit before Dialed flags it as needing your reply.
// Stored as hours; drives the inbox urgency colors (and, later, nudge timing).

export const INBOX_REMINDER_KEY = 'dialed_inbox_reminder_hours'
export const DEFAULT_REMINDER_HOURS = 24

export const REMINDER_PRESETS: { label: string; sub: string; hours: number }[] = [
  { label: 'Right away',        sub: 'Flag after 10 minutes', hours: 1 / 6 },
  { label: 'Within 30 minutes', sub: 'Flag after 30 minutes', hours: 0.5 },
  { label: 'Within an hour',    sub: 'Flag after 1 hour',     hours: 1 },
  { label: 'Within a few hours',sub: 'Flag after 3 hours',    hours: 3 },
  { label: 'Same day',          sub: 'Flag after 8 hours',    hours: 8 },
  { label: 'Within a day',      sub: 'Flag after 24 hours',   hours: 24 },
  { label: 'Within 3 days',     sub: 'Flag after 72 hours',   hours: 72 },
]

export async function loadReminderHours(): Promise<number> {
  try {
    const v = await AsyncStorage.getItem(INBOX_REMINDER_KEY)
    const n = v ? parseFloat(v) : NaN
    return Number.isFinite(n) && n > 0 ? n : DEFAULT_REMINDER_HOURS
  } catch { return DEFAULT_REMINDER_HOURS }
}

export async function saveReminderHours(hours: number): Promise<void> {
  try { await AsyncStorage.setItem(INBOX_REMINDER_KEY, String(hours)) } catch {}
}

// Compact label for the inbox chip ("10m" / "1h" / "1d").
export function reminderShortLabel(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)}m`
  if (hours < 24) return `${Math.round(hours)}h`
  return `${Math.round(hours / 24)}d`
}

// Urgency relative to the user's chosen target window.
export function urgencyTint(c: ColorPalette, waitedHours: number, targetHours: number): string {
  if (waitedHours >= targetHours) return c.overdue
  if (waitedHours >= targetHours * 0.5) return c.warning
  return c.secondary
}

export function isReplyOverdue(waitedHours: number, targetHours: number): boolean {
  return waitedHours >= targetHours
}
