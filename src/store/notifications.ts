import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { notifFromRow, notifToRow } from '../lib/mappers'

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
  loaded: boolean
  push: (n: Omit<Notification, 'id' | 'createdAt' | 'read'>) => void
  markAllRead: () => Promise<void>
  clear: () => Promise<void>
  unreadCount: () => number
  loadFromRemote: (userId: string) => Promise<void>
}

/**
 * Centrum Powiadomień (In-App) — bottom sheet dzwonka.
 * Trzymamy max 15 ostatnich zdarzeń (FIFO), z deduplikacją po `metaKey`
 * (żeby alert „Netflix · 3 dni" nie wystąpił dwa razy tego samego dnia).
 * Stan synchronizowany z tabelą `notifications` w Supabase.
 */
export const useNotifications = create<NotificationsState>()((set, get) => ({
  items: [],
  loaded: false,
  push: (n) => {
    const state = get()
    if (n.metaKey && state.items.some((it) => it.metaKey === n.metaKey)) {
      return // dedup w pamięci
    }
    const item: Notification = {
      ...n,
      id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: Date.now(),
      read: false,
    }
    set({ items: [item, ...state.items].slice(0, MAX_ITEMS) })
    // Zapis do Supabase w tle. unique(user_id, meta_key) jest bezpiecznikiem.
    void (async () => {
      const userId = (await supabase.auth.getUser()).data.user?.id
      if (!userId) return
      await supabase
        .from('notifications')
        .upsert(notifToRow(item, userId), { onConflict: 'user_id,meta_key', ignoreDuplicates: true })
    })()
  },
  markAllRead: async () => {
    set((state) => ({
      items: state.items.map((it) => (it.read ? it : { ...it, read: true })),
    }))
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) return
    await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false)
  },
  clear: async () => {
    set({ items: [] })
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) return
    await supabase.from('notifications').delete().eq('user_id', userId)
  },
  unreadCount: () => get().items.filter((it) => !it.read).length,
  loadFromRemote: async (userId) => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(MAX_ITEMS)
    set({
      items: (data ?? []).map(notifFromRow),
      loaded: true,
    })
  },
}))
