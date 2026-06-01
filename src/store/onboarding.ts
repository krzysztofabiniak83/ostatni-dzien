import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface OnboardingState {
  /** Czy user ukończył onboarding (przeszedł 3 ekrany). */
  done: boolean
  markDone: () => void
  reset: () => void
}

/**
 * Flaga ukończenia onboardingu — persystowana w localStorage.
 * Dashboard sprawdza `done` i redirectuje do /onboarding jeśli `false`.
 */
export const useOnboarding = create<OnboardingState>()(
  persist(
    (set) => ({
      done: false,
      markDone: () => set({ done: true }),
      reset: () => set({ done: false }),
    }),
    { name: 'ostatni-dzien-onboarding' },
  ),
)
