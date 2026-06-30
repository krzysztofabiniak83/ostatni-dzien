import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { isPatToken, lookupPat, signSupabaseJwt, touchPat } from './api-tokens.js'

export type AuthedContext = {
  supabase: SupabaseClient
  userId: string
}

/**
 * Buduje klienta Supabase z podanym Bearer tokenem i waliduje go.
 * Obsługuje dwa formaty:
 *  - krótkotrwały JWT sesji Supabase (klient web/mobile),
 *  - Personal Access Token `od_pat_...` (długotrwały, hashowany w DB).
 * Zwraca AuthedContext lub typowany błąd — bez pisania do response.
 */
export async function authenticateToken(
  token: string | null,
): Promise<
  | { ok: true; ctx: AuthedContext }
  | { ok: false; status: 401 | 500; error: string; message: string }
> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseAnon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnon) {
    return { ok: false, status: 500, error: 'server_misconfigured', message: 'Brak konfiguracji serwera (env vars).' }
  }
  if (!token) {
    return { ok: false, status: 401, error: 'unauthorized', message: 'Brak autoryzacji.' }
  }

  // Ścieżka PAT: lookup po hashu → świeży krótki JWT podpisany Supabase JWT_SECRET → klient z RLS jak zwykle.
  if (isPatToken(token)) {
    const pat = await lookupPat(token)
    if (!pat.ok) {
      const status = pat.error === 'db_error' || pat.error === 'server_misconfigured' ? 500 : 401
      return { ok: false, status, error: pat.error, message: pat.message }
    }
    const jwt = signSupabaseJwt(pat.userId)
    if (!jwt) {
      return { ok: false, status: 500, error: 'server_misconfigured', message: 'Brak SUPABASE_JWT_SECRET.' }
    }
    // Fire-and-forget: odśwież last_used_at.
    void touchPat(pat.tokenId)
    const supabase = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
    return { ok: true, ctx: { supabase, userId: pat.userId } }
  }

  // Ścieżka klasyczna: krótkotrwały JWT sesji Supabase.
  const supabase = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) {
    return { ok: false, status: 401, error: 'unauthorized', message: 'Nieprawidłowy token.' }
  }

  return { ok: true, ctx: { supabase, userId: data.user.id } }
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
  const auth = req.headers.authorization
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  const result = await authenticateToken(token)
  if (!result.ok) {
    res.status(result.status).json({ error: result.error, message: result.message })
    return null
  }
  return result.ctx
}
