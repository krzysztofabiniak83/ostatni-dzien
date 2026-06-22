import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export interface PersonaPublic {
  id: string
  name: string
  tagline: string
  description: string
  /** Pełne powitanie w pierwszej osobie, w tonie persony — używane w WelcomeIntro. */
  welcome_text: string
  avatar_emoji: string
  accent_color: string
  price_pln_grosze: number
  is_free: boolean
  sort_order: number
  is_active: boolean
}

interface PersonasState {
  personas: PersonaPublic[]
  owned: Set<string>
  activePersonaId: string
  loading: boolean
  error: string | null
  buying: string | null

  load: () => Promise<void>
  setActive: (personaId: string) => Promise<void>
  buy: (personaId: string) => Promise<void>
}

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

/**
 * Live store marketplace person — bez `persist`, zawsze świeże z serwera.
 * Ładowany przez `AuthGate` po zalogowaniu. Każda akcja synchronizuje
 * stan z bazą i odświeża listę.
 */
export const usePersonas = create<PersonasState>((set, get) => ({
  personas: [],
  owned: new Set<string>(['subskrypcik']),
  activePersonaId: 'subskrypcik',
  loading: false,
  error: null,
  buying: null,

  async load() {
    set({ loading: true, error: null })
    try {
      const res = await fetch('/api/personas', { headers: await authHeader() })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as {
        personas: PersonaPublic[]
        owned: string[]
        active: string
      }
      set({
        personas: data.personas,
        owned: new Set(data.owned),
        activePersonaId: data.active,
        loading: false,
      })
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : 'load_failed' })
    }
  },

  async setActive(personaId) {
    const prev = get().activePersonaId
    set({ activePersonaId: personaId })
    try {
      const res = await fetch('/api/personas/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify({ personaId }),
      })
      if (!res.ok) {
        set({ activePersonaId: prev })
        throw new Error(`HTTP ${res.status}`)
      }
    } catch (err) {
      set({ error: err instanceof Error ? err.message : 'activate_failed' })
    }
  },

  async buy(personaId) {
    set({ buying: personaId, error: null })
    try {
      const res = await fetch('/api/personas/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
        body: JSON.stringify({ personaId }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.message || `HTTP ${res.status}`)
      }
      const { url } = (await res.json()) as { url: string }
      window.location.assign(url)
    } catch (err) {
      set({ buying: null, error: err instanceof Error ? err.message : 'buy_failed' })
    }
  },
}))
