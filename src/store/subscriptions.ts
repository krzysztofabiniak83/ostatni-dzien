import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Subscription, SubscriptionType } from '../types/subscription'
import { MOCK_SUBSCRIPTIONS } from '../data/mock'

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
      remove: (id) =>
        set((state) => ({ subscriptions: state.subscriptions.filter((s) => s.id !== id) })),
      addSubscription: (input) => {
        const id = `user-${Date.now()}`
        const isTrial = input.type === 'trial'
        const sub: Subscription = {
          id,
          name: input.name.trim() || 'Nowa subskrypcja',
          logoClass: '',
          logoText: (input.name.trim()[0] || '?').toUpperCase(),
          daysUntil: 14,
          date: input.date.trim() || '—',
          amount: input.amount.trim() || '—',
          period: isTrial ? 'po próbie, potem miesięcznie' : 'miesięcznie',
          periodShort: isTrial ? 'po próbie' : 'miesięcznie',
          type: input.type,
          urgency: 'normal',
          section: 'month',
          chartHeights: [0, 0, 0, 0, 0, 4],
          chartTotal: '0 zł',
        }
        set((state) => ({
          subscriptions: [sub, ...state.subscriptions],
          lastAddedId: id,
        }))
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
