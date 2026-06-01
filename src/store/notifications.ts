import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type NotificationType = 'critical' | 'info'

export interface Notification {
  id: string
  type: NotificationType
  /** Tytuł — zwięzły konkret. Np. "Netflix: Pobranie opłaty za 3 dni". */
  title: string
  /** Podtytuł / konsekwencja. Np. "Z konta zniknie 67,00 zł". */
  subtitle: string
  /** Klucz logo brandu (Netflix → 'netflix' itp.) dla wizualizacji w liście. */
  logoClass?: string
  logoText?: string
  /** Systemowy glyph zamiast logo (np. 'check' dla potwierdzeń). */
  iconSystem?: 'check' | 'trash'
  /** Id subskrypcji — jeśli ustawione, klik w powiadomienie nawiguje do /sub/:id. */
  subId?: string
  createdAt: number
  read: boolean
  /** Klucz deduplikacji — np. `critical:adobe:0`. Nie pushujemy ponownie tego samego. */
  metaKey?: string
}

const MAX_ITEMS = 15

interface NotificationsState {
  items: Notification[]
  push: (n: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void
  markAllRead: () => void
  clear: () => void
  unreadCount: () => number
}

/**
 * Centrum Powiadomień (In-App) — bottom sheet dzwonka.
 * Trzymamy max 15 ostatnich zdarzeń (FIFO), z deduplikacją po `metaKey`
 * (żeby alert „Netflix · 3 dni" nie wystąpił dwa razy tego samego dnia).
 */
export const useNotifications = create<NotificationsState>()(
  persist(
    (set, get) => ({
      items: [],
      push: (n) => {
        const state = get()
        if (n.metaKey && state.items.some((it) => it.metaKey === n.metaKey)) {
          return // dedup
        }
        const item: Notification = {
          ...n,
          id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          createdAt: Date.now(),
          read: false,
        }
        set({ items: [item, ...state.items].slice(0, MAX_ITEMS) })
      },
      markAllRead: () =>
        set((state) => ({
          items: state.items.map((it) => (it.read ? it : { ...it, read: true })),
        })),
      clear: () => set({ items: [] }),
      unreadCount: () => get().items.filter((it) => !it.read).length,
    }),
    { name: 'ostatni-dzien-notifications' },
  ),
)
