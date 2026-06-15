// Single source of truth for per-contact relationship health.
// Score = how much of the contact's cadence window is still "fresh".
// 100 = just talked, 0 = a full cadence cycle (or more) overdue.
// This is the same formula the contact detail page has always used —
// every screen now derives its badge/label/color/dot from it so the
// signals can never disagree.

import type { ColorPalette } from '@/hooks/use-theme'

export type HealthBandKey = 'critical' | 'needs-attention' | 'good' | 'strong'

interface HealthInput {
  days_since_contact: number
  cadence_days: number
}

export function contactHealthScore(contact: HealthInput): number {
  const cadence = contact.cadence_days || 1
  return Math.max(0, Math.min(100, Math.round((1 - contact.days_since_contact / cadence) * 100)))
}

// Bands: 0–25 Critical · 26–50 Needs attention · 51–75 Good · 76–100 Strong
export function healthBand(score: number): HealthBandKey {
  if (score <= 25) return 'critical'
  if (score <= 50) return 'needs-attention'
  if (score <= 75) return 'good'
  return 'strong'
}

const BAND_LABELS: Record<HealthBandKey, string> = {
  critical: 'Critical',
  'needs-attention': 'Needs attention',
  good: 'Good',
  strong: 'Strong',
}

export function healthLabel(score: number): string {
  return BAND_LABELS[healthBand(score)]
}

// Temperature gradient: red → amber → green. Good and Strong are both
// green (healthy); only the label distinguishes them.
export function healthColor(c: ColorPalette, score: number): string {
  const band = healthBand(score)
  if (band === 'critical') return c.overdue
  if (band === 'needs-attention') return c.warning
  return c.success
}
