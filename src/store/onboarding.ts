import { create } from 'zustand'
import { supabase } from '../lib/supabase'

interface OnboardingState {
  done: boolean
  loaded: boolean
  markDone: () => Promise<void>
  reset: () => Promise<void>
  loadFromRemote: (userId: string) => Promise<void>
}

/**
 * Flaga ukończenia onboardingu — trzymana w Supabase (tabela onboarding_state).
 * Dashboard sprawdza `done` i redirectuje do /onboarding jeśli `false`.
 */
export const useOnboarding = create<OnboardingState>()((set) => ({
  done: false,
  loaded: false,
  markDone: async () => {
    set({ done: true })
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) return
    await supabase
      .from('onboarding_state')
      .upsert({ user_id: userId, done: true }, { onConflict: 'user_id' })
  },
  reset: async () => {
    set({ done: false })
    const userId = (await supabase.auth.getUser()).data.user?.id
    if (!userId) return
    await supabase
      .from('onboarding_state')
      .upsert({ user_id: userId, done: false }, { onConflict: 'user_id' })
  },
  loadFromRemote: async (userId) => {
    const { data } = await supabase
      .from('onboarding_state')
      .select('done')
      .eq('user_id', userId)
      .maybeSingle()
    set({ done: data?.done ?? false, loaded: true })
  },
}))
