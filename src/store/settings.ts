import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ReminderDays = 1 | 3 | 7
export type Currency = 'PLN' | 'EUR' | 'USD'

interface SettingsState {
  /** Czy wysyłamy przypomnienia o pobraniach. */
  notify: boolean
  /** Ile dni przed pobraniem ostrzec. */
  reminderDays: ReminderDays
  /** Waluta głównego podsumowania. */
  currency: Currency
  setNotify: (v: boolean) => void
  setReminderDays: (v: ReminderDays) => void
  setCurrency: (v: Currency) => void
}

/**
 * Preferencje użytkownika — persystowane w localStorage.
 * Domyślnie powiadomienia ON, przypomnienie na 3 dni przed, waluta PLN.
 */
export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      notify: true,
      reminderDays: 3,
      currency: 'PLN',
      setNotify: (v) => set({ notify: v }),
      setReminderDays: (v) => set({ reminderDays: v }),
      setCurrency: (v) => set({ currency: v }),
    }),
    { name: 'ostatni-dzien-settings' },
  ),
)
