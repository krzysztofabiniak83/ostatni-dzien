import type { Subscription } from '../types/subscription'
import type { Notification } from '../store/notifications'
import type { Currency, ReminderDays } from '../store/settings'
import { isCategoryId, type CategoryId } from '../../api/_shared/categories'

// ===== subscriptions =====

interface DbSubscription {
  id: string
  user_id: string
  name: string
  logo_class: string | null
  logo_text: string | null
  days_until: number
  date: string
  amount_pln: number
  period: string | null
  period_short: string | null
  type: 'trial' | 'renewal'
  urgency: 'today' | 'critical' | 'normal'
  section: 'today' | 'week' | 'month' | 'later'
  chart_heights: number[]
  chart_total_pln: number
  category?: CategoryId | null
}

export function subFromRow(r: DbSubscription): Subscription {
  return {
    id: r.id,
    name: r.name,
    logoClass: r.logo_class ?? '',
    logoText: r.logo_text ?? '',
    daysUntil: r.days_until,
    date: r.date,
    amountPLN: r.amount_pln,
    period: r.period ?? '',
    periodShort: r.period_short ?? '',
    type: r.type,
    urgency: r.urgency,
    section: r.section,
    chartHeights: r.chart_heights ?? [],
    chartTotalPLN: r.chart_total_pln,
    category: isCategoryId(r.category) ? r.category : undefined,
  }
}

export function subToRow(s: Subscription, userId: string): DbSubscription {
  return {
    id: s.id,
    user_id: userId,
    name: s.name,
    logo_class: s.logoClass || null,
    logo_text: s.logoText || null,
    days_until: s.daysUntil,
    date: s.date,
    amount_pln: s.amountPLN,
    period: s.period || null,
    period_short: s.periodShort || null,
    type: s.type,
    urgency: s.urgency,
    section: s.section,
    chart_heights: s.chartHeights,
    chart_total_pln: s.chartTotalPLN,
    category: s.category ?? 'other',
  }
}

// ===== notifications =====

interface DbNotification {
  id: string
  user_id: string
  type: 'critical' | 'info'
  title: string
  subtitle: string
  logo_class: string | null
  logo_text: string | null
  icon_system: 'check' | 'trash' | null
  sub_id: string | null
  meta_key: string | null
  read: boolean
  created_at: string
}

export function notifFromRow(r: DbNotification): Notification {
  return {
    id: r.id,
    type: r.type,
    title: r.title,
    subtitle: r.subtitle,
    logoClass: r.logo_class ?? undefined,
    logoText: r.logo_text ?? undefined,
    iconSystem: r.icon_system ?? undefined,
    subId: r.sub_id ?? undefined,
    metaKey: r.meta_key ?? undefined,
    read: r.read,
    createdAt: new Date(r.created_at).getTime(),
  }
}

export function notifToRow(n: Notification, userId: string) {
  return {
    id: n.id,
    user_id: userId,
    type: n.type,
    title: n.title,
    subtitle: n.subtitle,
    logo_class: n.logoClass ?? null,
    logo_text: n.logoText ?? null,
    icon_system: n.iconSystem ?? null,
    sub_id: n.subId ?? null,
    meta_key: n.metaKey ?? null,
    read: n.read,
    created_at: new Date(n.createdAt).toISOString(),
  }
}

// ===== settings =====

export interface DbSettings {
  user_id: string
  notify: boolean
  reminder_days: ReminderDays
  currency: Currency
}

// ===== onboarding =====

export interface DbOnboarding {
  user_id: string
  done: boolean
}
