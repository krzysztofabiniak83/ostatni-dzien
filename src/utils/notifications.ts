import type { Subscription } from '../types/subscription'
import type { Notification } from '../store/notifications'

/**
 * Dla danego dnia (`daysUntil`) zwraca polski opis: "dzisiaj", "jutro", "za N dni".
 * Dla `daysUntil = -1` (specjalna wartość "Dziś" w danych) zwracamy "dzisiaj".
 */
function describeDays(days: number): string {
  if (days <= 0) return 'dzisiaj'
  if (days === 1) return 'jutro'
  if (days >= 2 && days <= 4) return `za ${days} dni`
  return `za ${days} dni`
}

/**
 * Tytuł alertu krytycznego — różny dla triala vs odnowienia.
 *   Trial: "Netflix: Próbny okres kończy się za 3 dni"
 *   Renewal: "Netflix: Pobranie opłaty za 3 dni"
 */
function alertTitle(sub: Subscription, effectiveDays: number): string {
  const when = describeDays(effectiveDays)
  if (sub.type === 'trial') {
    return `${sub.name}: Próbny okres kończy się ${when}`
  }
  return `${sub.name}: Pobranie opłaty ${when}`
}

/**
 * Sprawdza wszystkie subskrypcje i zwraca te, które wymagają alertu krytycznego
 * przy danym `reminderDays`. Wraz z `metaKey` deduplikacji.
 */
export function buildPaymentAlerts(
  subscriptions: Subscription[],
  reminderDays: number,
  formatAmount: (amountPLN: number) => string,
): Omit<Notification, 'id' | 'createdAt' | 'read'>[] {
  // Zwracamy w kolejności DESC po pilności (najmniej pilne pierwsze).
  // Dashboard iteruje przez wynik i pushuje każdą notyfikację na górę storu,
  // więc najpilniejsza wpada ostatnia → ląduje na samym topie listy.
  const matched = subscriptions
    .map((sub) => {
      const effectiveDays = sub.daysUntil === -1 ? 0 : sub.daysUntil
      if (effectiveDays < 0 || effectiveDays > reminderDays) return null
      return { sub, effectiveDays }
    })
    .filter((x): x is { sub: Subscription; effectiveDays: number } => x !== null)
    .sort((a, b) => b.effectiveDays - a.effectiveDays)

  return matched.map(({ sub, effectiveDays }) => ({
    type: 'critical' as const,
    title: alertTitle(sub, effectiveDays),
    subtitle: `Z konta zniknie ${formatAmount(sub.amountPLN)}`,
    logoClass: sub.logoClass,
    logoText: sub.logoText,
    subId: sub.id,
    metaKey: `critical:${sub.id}:${effectiveDays}`,
  }))
}

/**
 * Format relatywnego czasu dla wyświetlania w liście.
 *   < 60s → "teraz"
 *   < 60m → "X min temu"
 *   < 24h tego samego dnia kalendarzowego → "dzisiaj, HH:MM"
 *   wczoraj → "wczoraj, HH:MM"
 *   inaczej → "N dni temu"
 */
export function formatRelativeTime(ts: number, now = Date.now()): string {
  const diffMs = now - ts
  const diffMin = Math.floor(diffMs / 60_000)

  if (diffMin < 1) return 'teraz'
  if (diffMin < 60) return `${diffMin} min temu`

  const date = new Date(ts)
  const nowDate = new Date(now)
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')

  const sameDay =
    date.getFullYear() === nowDate.getFullYear() &&
    date.getMonth() === nowDate.getMonth() &&
    date.getDate() === nowDate.getDate()
  if (sameDay) return `dzisiaj, ${hh}:${mm}`

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate()
  if (isYesterday) return `wczoraj, ${hh}:${mm}`

  const diffDays = Math.floor((now - ts) / 86_400_000)
  return `${diffDays} dni temu`
}
