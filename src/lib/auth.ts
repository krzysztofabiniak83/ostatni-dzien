import { useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from './supabase'

interface AuthState {
  /** undefined = nie wiemy jeszcze (ładujemy), null = niezalogowany, Session = zalogowany */
  session: Session | null | undefined
  user: User | null
}

/**
 * Hook do stanu auth. Inicjalnie `session: undefined` (loading), potem
 * Supabase emituje `INITIAL_SESSION` przez onAuthStateChange i ustawiamy
 * realny stan. Magic link callback (?code=...) jest obsługiwany przez SDK
 * dzięki detectSessionInUrl: true.
 */
export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })
    return () => {
      data.subscription.unsubscribe()
    }
  }, [])

  return { session, user: session?.user ?? null }
}

export async function signInWithPassword(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
}

export async function signUpWithPassword(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({ email, password })
  if (error) throw error
  // Jeśli „Confirm email" jest wyłączone w Dashboardzie, Supabase zwraca
  // od razu aktywną sesję. Jeśli jest włączone — session jest null i user
  // musi kliknąć w link. Sygnalizujemy to wywołującemu.
  return { needsConfirmation: !data.session }
}

export async function signOut() {
  await supabase.auth.signOut()
}
