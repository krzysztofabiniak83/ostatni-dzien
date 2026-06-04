import { useEffect, useState, type ReactNode } from 'react'
import { useSubscriptions } from '../store/subscriptions'
import { useSettings } from '../store/settings'
import { useNotifications } from '../store/notifications'
import { useOnboarding } from '../store/onboarding'
import { supabase } from '../lib/supabase'
import { subToRow } from '../lib/mappers'
import type { Subscription } from '../types/subscription'

const MIGRATION_FLAG = 'ostatni-dzien-migrated-to-supabase'

/**
 * One-shot import: jeśli na urządzeniu są legacy dane w localStorage
 * (klucze z poprzedniej wersji opartej o zustand/persist), wrzuć je do
 * Supabase przy pierwszym logowaniu konkretnego usera. Ustawiamy flagę
 * w localStorage, żeby nie powtarzać tego między sesjami.
 */
async function migrateLocalStorageOnce(userId: string) {
  if (localStorage.getItem(MIGRATION_FLAG) === userId) return

  try {
    const subsRaw = localStorage.getItem('ostatni-dzien-subs')
    if (subsRaw) {
      const parsed = JSON.parse(subsRaw)
      const list: Subscription[] = Array.isArray(parsed?.state?.subscriptions)
        ? parsed.state.subscriptions.filter((s: Subscription) => typeof s?.id === 'string')
        : []
      if (list.length > 0) {
        await supabase
          .from('subscriptions')
          .upsert(list.map((s) => subToRow(s, userId)), { onConflict: 'id' })
      }
    }

    const onbRaw = localStorage.getItem('ostatni-dzien-onboarding')
    if (onbRaw) {
      const parsed = JSON.parse(onbRaw)
      if (parsed?.state?.done === true) {
        await supabase
          .from('onboarding_state')
          .upsert({ user_id: userId, done: true }, { onConflict: 'user_id' })
      }
    }

    const setRaw = localStorage.getItem('ostatni-dzien-settings')
    if (setRaw) {
      const parsed = JSON.parse(setRaw)
      const s = parsed?.state
      if (s) {
        await supabase.from('user_settings').upsert(
          {
            user_id: userId,
            notify: typeof s.notify === 'boolean' ? s.notify : true,
            reminder_days: [1, 3, 7].includes(s.reminderDays) ? s.reminderDays : 3,
            currency: ['PLN', 'EUR', 'USD'].includes(s.currency) ? s.currency : 'PLN',
          },
          { onConflict: 'user_id' },
        )
      }
    }
  } catch {
    // niech błąd migracji nie blokuje wejścia do aplikacji
  }

  localStorage.setItem(MIGRATION_FLAG, userId)
}

interface Props {
  userId: string
  children: ReactNode
  fallback: ReactNode
}

/**
 * Po wykryciu sesji ładuje stan z Supabase do czterech store'ów.
 * Renderuje children dopiero gdy wszystkie się załadowały.
 */
export function AuthGate({ userId, children, fallback }: Props) {
  // Trzymamy aktualny userId wraz z gotowością, żeby reset po zmianie usera
  // nie wymagał oddzielnego setState w efekcie (lint: set-state-in-effect).
  const [readyFor, setReadyFor] = useState<string | null>(null)
  const ready = readyFor === userId

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      await migrateLocalStorageOnce(userId)
      await Promise.all([
        useSubscriptions.getState().loadFromRemote(userId),
        useSettings.getState().loadFromRemote(userId),
        useNotifications.getState().loadFromRemote(userId),
        useOnboarding.getState().loadFromRemote(userId),
      ])
      if (!cancelled) setReadyFor(userId)
    })()
    return () => {
      cancelled = true
    }
  }, [userId])

  return <>{ready ? children : fallback}</>
}
