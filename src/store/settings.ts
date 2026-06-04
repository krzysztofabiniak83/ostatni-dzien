import { create } from 'zustand'
import { supabase } from '../lib/supabase'

export type ReminderDays = 1 | 3 | 7
export type Currency = 'PLN' | 'EUR' | 'USD'

interface SettingsState {
  notify: boolean
  reminderDays: ReminderDays
  currency: Currency
  loaded: boolean
  setNotify: (v: boolean) => Promise<void>
  setReminderDays: (v: ReminderDays) => Promise<void>
  setCurrency: (v: Currency) => Promise<void>
  loadFromRemote: (userId: string) => Promise<void>
}

async function persistField(
  field: 'notify' | 'reminder_days' | 'currency',
  value: boolean | number | string,
) {
  const userId = (await supabase.auth.getUser()).data.user?.id
  if (!userId) return
  await supabase
    .from('user_settings')
    .upsert({ user_id: userId, [field]: value }, { onConflict: 'user_id' })
}

/**
 * Preferencje użytkownika — trzymane w Supabase (tabela user_settings).
 * Domyślnie powiadomienia ON, przypomnienie na 3 dni przed, waluta PLN.
 */
export const useSettings = create<SettingsState>()((set) => ({
  notify: true,
  reminderDays: 3,
  currency: 'PLN',
  loaded: false,
  setNotify: async (v) => {
    set({ notify: v })
    await persistField('notify', v)
  },
  setReminderDays: async (v) => {
    set({ reminderDays: v })
    await persistField('reminder_days', v)
  },
  setCurrency: async (v) => {
    set({ currency: v })
    await persistField('currency', v)
  },
  loadFromRemote: async (userId) => {
    const { data } = await supabase
      .from('user_settings')
      .select('notify, reminder_days, currency')
      .eq('user_id', userId)
      .maybeSingle()
    if (data) {
      set({
        notify: data.notify,
        reminderDays: data.reminder_days as ReminderDays,
        currency: data.currency as Currency,
        loaded: true,
      })
    } else {
      // Pierwsze logowanie — utwórz wiersz z domyślnymi wartościami.
      await supabase
        .from('user_settings')
        .upsert({ user_id: userId }, { onConflict: 'user_id' })
      set({ loaded: true })
    }
  },
}))
