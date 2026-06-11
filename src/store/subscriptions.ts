import { create } from 'zustand'
import type { Subscription, SubscriptionType } from '../types/subscription'
import { MOCK_SUBSCRIPTIONS } from '../data/mock'
import { useNotifications } from './notifications'
import { useSettings } from './settings'
import { formatAmount, parseAmountInput } from '../utils/currency'
import { supabase } from '../lib/supabase'
import { subFromRow, subToRow } from '../lib/mappers'

export interface NewSubscriptionInput {
  name: string
  amount: string
  date: string
  type: SubscriptionType
}

interface SubscriptionsState {
  subscriptions: Subscription[]
  loaded: boolean
  /** Id ostatnio dodanej subskrypcji — do podświetlenia karty na dashboardzie. */
  lastAddedId: string | null
  getById: (id: string) => Subscription | undefined
  remove: (id: string) => Promise<void>
  addSubscription: (input: NewSubscriptionInput) => Promise<string>
  clearLastAdded: () => void
  reseedDemo: () => Promise<void>
  loadFromRemote: (userId: string) => Promise<void>
}

/**
 * Store subskrypcji synchronizowany z Supabase (tabela `subscriptions`).
 * Pierwsze logowanie na nowym koncie seeduje MOCK_SUBSCRIPTIONS żeby UX
 * nie pokazywał pustego dashboardu od razu.
 */
export const useSubscriptions = create<SubscriptionsState>()((set, get) => ({
  subscriptions: [],
  loaded: false,
  lastAddedId: null,
  getById: (id) => get().subscriptions.find((s) => s.id === id),
  remove: async (id) => {
    const sub = get().subscriptions.find((s) => s.id === id)
    set((state) => ({ subscriptions: state.subscriptions.filter((s) => s.id !== id) }))
    if (sub) {
      useNotifications.getState().push({
        type: 'info',
        iconSystem: 'trash',
        title: `${sub.name}: Usunięto z listy`,
        subtitle: 'Subskrypcja zniknęła z aplikacji — nie wpływa to na samą usługę.',
      })
    }
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) return
    await supabase.from('subscriptions').delete().eq('user_id', userId).eq('id', id)
  },
  addSubscription: async (input) => {
    const id = `user-${Date.now()}`
    const isTrial = input.type === 'trial'
    const name = input.name.trim() || 'Nowa subskrypcja'
    // Parsujemy kwotę z inputu (np. "29,99 zł") na grosze; nie udało się → 0.
    const amountPLN = parseAmountInput(input.amount) ?? 0
    const sub: Subscription = {
      id,
      name,
      logoClass: '',
      logoText: (name[0] || '?').toUpperCase(),
      daysUntil: 14,
      date: input.date.trim() || '—',
      amountPLN,
      period: isTrial ? 'po próbie, potem miesięcznie' : 'miesięcznie',
      periodShort: isTrial ? 'po próbie' : 'miesięcznie',
      type: input.type,
      urgency: 'normal',
      section: 'month',
      chartHeights: [0, 0, 0, 0, 0, 4],
      chartTotalPLN: 0,
    }
    set((state) => ({
      subscriptions: [sub, ...state.subscriptions],
      lastAddedId: id,
    }))
    // Powiadomienie potwierdzające w aktualnej walucie z ustawień.
    const currency = useSettings.getState().currency
    const RATES: Record<typeof currency, number> = { PLN: 1, EUR: 0.2336, USD: 0.2519 }
    const formatted = formatAmount(
      currency === 'PLN' ? amountPLN : Math.round(amountPLN * RATES[currency]),
      currency,
    )
    useNotifications.getState().push({
      type: 'info',
      iconSystem: 'check',
      title: `${name}: Dodano do listy`,
      subtitle: isTrial
        ? `Pierwsza opłata ${formatted} po próbie. Przypomnimy zanim pobiorą środki.`
        : `Pobranie ${formatted}. Przypomnimy zanim pobiorą środki.`,
      subId: id,
    })
    // Insert do Supabase. Jeśli błąd → rollback lokalnie + krytyczne powiadomienie.
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (userId) {
      const { error } = await supabase.from('subscriptions').insert(subToRow(sub, userId))
      if (error) {
        set((state) => ({
          subscriptions: state.subscriptions.filter((s) => s.id !== id),
          lastAddedId: null,
        }))
        useNotifications.getState().push({
          type: 'critical',
          title: 'Nie udało się zapisać subskrypcji',
          subtitle: error.message,
        })
      }
    }
    return id
  },
  clearLastAdded: () => set({ lastAddedId: null }),
  /** Czyści bieżące subskrypcje (w Supabase + store) i ładuje ponownie MOCK_SUBSCRIPTIONS.
   *  Używane z Ustawień jako "Załaduj subskrypcje demo". */
  reseedDemo: async () => {
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) return
    await supabase.from('subscriptions').delete().eq('user_id', userId)
    const rows = MOCK_SUBSCRIPTIONS.map((s) => subToRow(s, userId))
    await supabase.from('subscriptions').upsert(rows, { onConflict: 'id' })
    set({ subscriptions: MOCK_SUBSCRIPTIONS, lastAddedId: null })
  },
  loadFromRemote: async (userId) => {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) {
      set({ loaded: true })
      return
    }
    if (!data || data.length === 0) {
      // Pierwsze logowanie — seed mock danymi, żeby dashboard nie był pusty.
      const rows = MOCK_SUBSCRIPTIONS.map((s) => subToRow(s, userId))
      await supabase.from('subscriptions').upsert(rows, { onConflict: 'id' })
      set({ subscriptions: MOCK_SUBSCRIPTIONS, loaded: true })
      return
    }
    set({ subscriptions: data.map(subFromRow), loaded: true })
  },
}))
