export function getEscalationIntensity(stars: number, daysLeft: number): { level: number; label: string } {
  if (stars === 5) {
    if (daysLeft <= 1) return { level: 5, label: 'Daily' }
    if (daysLeft <= 3) return { level: 4, label: 'Daily' }
    if (daysLeft <= 7) return { level: 3, label: 'Every 2 days' }
    return { level: 2, label: 'Single' }
  }
  if (stars === 4) {
    if (daysLeft <= 1) return { level: 4, label: 'Daily' }
    if (daysLeft <= 3) return { level: 3, label: 'Every 2 days' }
    return { level: 2, label: 'Single' }
  }
  if (stars === 3) {
    if (daysLeft <= 1) return { level: 3, label: 'Every 2 days' }
    if (daysLeft <= 3) return { level: 2, label: 'Single' }
    return { level: 1, label: 'Single' }
  }
  if (stars === 2) {
    if (daysLeft <= 1) return { level: 2, label: 'Single' }
    return { level: 1, label: 'Single' }
  }
  return { level: 1, label: 'Single' }
}
