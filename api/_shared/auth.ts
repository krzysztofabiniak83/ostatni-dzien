import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export type AuthedContext = {
  supabase: SupabaseClient
  userId: string
}

/**
 * Buduje klienta Supabase z podanym Bearer tokenem i waliduje go.
 * Zwraca AuthedContext lub typowany błąd — bez pisania do response,
 * żeby dało się reużyć z innych transportów (np. MCP).
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
