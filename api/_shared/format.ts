const POLISH_MONTHS = [
  'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
  'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia',
]

/** Format "Dziś · 9:00" / "2 czerwca · 9:00" zgodny z resztą bazy. */
export function formatSubDate(daysUntil: number): string {
  const d = new Date()
  d.setDate(d.getDate() + Math.max(0, daysUntil))
  if (daysUntil <= 0) return 'Dziś · 9:00'
  return `${d.getDate()} ${POLISH_MONTHS[d.getMonth()]} · 9:00`
}

export function sectionFor(daysUntil: number): 'today' | 'week' | 'month' | 'later' {
  if (daysUntil <= 0) return 'today'
  if (daysUntil <= 7) return 'week'
  if (daysUntil <= 31) return 'month'
  return 'later'
}

export function urgencyFor(daysUntil: number): 'today' | 'critical' | 'normal' {
  if (daysUntil <= 0) return 'today'
  if (daysUntil <= 3) return 'critical'
  return 'normal'
}
