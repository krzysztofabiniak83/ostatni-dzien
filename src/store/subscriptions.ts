import { create } from 'zustand'
import type { Subscription } from '../types/subscription'
import { MOCK_SUBSCRIPTIONS } from '../data/mock'

interface SubscriptionsState {
  subscriptions: Subscription[]
  getById: (id: string) => Subscription | undefined
  remove: (id: string) => void
}

/**
 * Store subskrypcji. W Fazie 1-2 trzyma mock data + usuwanie z listy.
 * Persistencja (localStorage) i dodawanie dojdą w Fazie 3.
 */
export const useSubscriptions = create<SubscriptionsState>((set, get) => ({
  subscriptions: MOCK_SUBSCRIPTIONS,
  getById: (id) => get().subscriptions.find((s) => s.id === id),
  remove: (id) =>
    set((state) => ({ subscriptions: state.subscriptions.filter((s) => s.id !== id) })),
}))
