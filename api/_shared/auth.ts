import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export type AuthedContext = {
  supabase: SupabaseClient
  userId: string
}

/**
 * Waliduje Bearer token z headera Authorization i zwraca klienta supabase
 * z tym tokenem (RLS respektowany) oraz userId. Sam pisze odpowiedź 401/500
 * i zwraca null gdy nie uda się autoryzować.
 */
export async function getUserFromRequest(
  req: VercelRequest,
  res: VercelResponse,
): Promise<AuthedContext | null> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseAnon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnon) {
    res.status(500).json({ error: 'server_misconfigured', message: 'Brak konfiguracji serwera (env vars).' })
    return null
  }

  const auth = req.headers.authorization
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) {
    res.status(401).json({ error: 'unauthorized', message: 'Brak autoryzacji.' })
    return null
  }

  const supabase = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) {
    res.status(401).json({ error: 'unauthorized', message: 'Nieprawidłowy token.' })
    return null
  }

  return { supabase, userId: data.user.id }
}
