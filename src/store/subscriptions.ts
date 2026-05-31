import { create } from 'zustand'
import type { Subscription } from '../types/subscription'
import { MOCK_SUBSCRIPTIONS } from '../data/mock'

interface SubscriptionsState {
  subscriptions: Subscription[]
  getById: (id: string) => Subscription | undefined
}

/**
 * Store subskrypcji. W Fazie 1 trzyma tylko mock data.
 * Persistencja (localStorage) i mutacje (dodaj/usuń) dojdą w Fazie 3.
 */
export const useSubscriptions = create<SubscriptionsState>((_set, get) => ({
  subscriptions: MOCK_SUBSCRIPTIONS,
  getById: (id) => get().subscriptions.find((s) => s.id === id),
}))
