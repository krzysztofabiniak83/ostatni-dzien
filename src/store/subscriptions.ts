import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Subscription, SubscriptionType } from '../types/subscription'
import { MOCK_SUBSCRIPTIONS } from '../data/mock'
import { useNotifications } from './notifications'
import { formatAmount, parseAmountInput } from '../utils/currency'

export interface NewSubscriptionInput {
  name: string
  amount: string
  date: string
  type: SubscriptionType
}

interface SubscriptionsState {
  subscriptions: Subscription[]
  /** Id ostatnio dodanej subskrypcji — do podświetlenia karty na dashboardzie. */
  lastAddedId: string | null
  getById: (id: string) => Subscription | undefined
  remove: (id: string) => void
  addSubscription: (input: NewSubscriptionInput) => string
  clearLastAdded: () => void
}

/**
 * Store subskrypcji z persystencją w localStorage (zustand persist).
 * Mock jest seedem przy pierwszym uruchomieniu; potem stan (add/remove) trwa
 * między odświeżeniami. Persystowane są tylko subskrypcje.
 */
export const useSubscriptions = create<SubscriptionsState>()(
  persist(
    (set, get) => ({
      subscriptions: MOCK_SUBSCRIPTIONS,
      lastAddedId: null,
      getById: (id) => get().subscriptions.find((s) => s.id === id),
      remove: (id) => {
        const sub = get().subscriptions.find((s) => s.id === id)
        set((state) => ({ subscriptions: state.subscriptions.filter((s) => s.id !== id) }))
        if (sub) {
          // Brak subId — usunięcie znaczy że już nie ma do czego nawigować.
          useNotifications.getState().push({
            type: 'info',
            iconSystem: 'trash',
            title: `${sub.name}: Usunięto z listy`,
            subtitle: 'Subskrypcja zniknęła z aplikacji — nie wpływa to na samą usługę.',
          })
        }
      },
      addSubscription: (input) => {
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
        // Powiadomienie potwierdzające — kwoty w obecnej walucie z ustawień.
        // Czytamy walutę bezpośrednio z localStorage (nie ma hooków w storze).
        let currency: 'PLN' | 'EUR' | 'USD' = 'PLN'
        try {
          const raw = JSON.parse(localStorage.getItem('ostatni-dzien-settings') || '{}')
          if (raw?.state?.currency) currency = raw.state.currency
        } catch {
          // ignore
        }
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
        return id
      },
      clearLastAdded: () => set({ lastAddedId: null }),
    }),
    {
      name: 'ostatni-dzien-subs',
      partialize: (state) => ({ subscriptions: state.subscriptions }),
    },
  ),
)
