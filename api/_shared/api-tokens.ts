import crypto from 'node:crypto'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Helpery dla Personal Access Tokenów (PAT).
 *
 * Format surowego tokena: `od_pat_<43 znaki base64url>` (32 bajty entropii).
 * W DB trzymamy tylko `sha256(rawToken)` jako hex. Token nigdy nie trafia do logów.
 */

export const PAT_PREFIX = 'od_pat_'
const RAW_BYTES = 32

export function isPatToken(token: string): boolean {
  return token.startsWith(PAT_PREFIX)
}

export function generatePat(): { raw: string; hash: string; preview: string } {
  const random = crypto.randomBytes(RAW_BYTES).toString('base64url')
  const raw = `${PAT_PREFIX}${random}`
  const hash = sha256Hex(raw)
  // Preview = prefix + pierwsze 4 znaki części losowej (np. "od_pat_aB3x").
  const preview = `${PAT_PREFIX}${random.slice(0, 4)}`
  return { raw, hash, preview }
}

export function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex')
}

/**
 * Service-role client — używany do operacji infrastrukturalnych, których
 * nie da się zrobić pod RLS (np. lookup tokena po hashu zanim zidentyfikujemy usera).
 */
export function serviceClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

/**
 * Podpisuje krótkotrwały JWT zgodny z Supabase Auth (HS256, claims sub+role).
 * Używany po walidacji PAT, żeby utworzyć user-scoped klienta z RLS jak przy zwykłej sesji.
 */
export function signSupabaseJwt(userId: string, ttlSeconds = 300): string | null {
  const secret = process.env.SUPABASE_JWT_SECRET
  if (!secret) return null

  const header = { alg: 'HS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    sub: userId,
    role: 'authenticated',
    aud: 'authenticated',
    iat: now,
    exp: now + ttlSeconds,
  }

  const b64 = (obj: object) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url')

  const signingInput = `${b64(header)}.${b64(payload)}`
  const sig = crypto.createHmac('sha256', secret).update(signingInput).digest('base64url')
  return `${signingInput}.${sig}`
}

export type PatLookup =
  | { ok: true; userId: string; tokenId: string }
  | { ok: false; error: string; message: string }

/**
 * Sprawdza PAT po hashu, weryfikuje że nie jest revoked/wygasły.
 * Zwraca user_id i ID tokenu — bez aktualizacji last_used_at (caller decyduje).
 */
export async function lookupPat(rawToken: string): Promise<PatLookup> {
  const svc = serviceClient()
  if (!svc) {
    return { ok: false, error: 'server_misconfigured', message: 'Brak SUPABASE_SERVICE_ROLE_KEY.' }
  }
  const hash = sha256Hex(rawToken)
  const { data, error } = await svc
    .from('api_tokens')
    .select('id, user_id, revoked_at, expires_at')
    .eq('token_hash', hash)
    .maybeSingle()

  if (error) return { ok: false, error: 'db_error', message: error.message }
  if (!data) return { ok: false, error: 'unauthorized', message: 'Nieprawidłowy token.' }
  if (data.revoked_at) return { ok: false, error: 'unauthorized', message: 'Token został odwołany.' }
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
    return { ok: false, error: 'unauthorized', message: 'Token wygasł.' }
  }
  return { ok: true, userId: data.user_id, tokenId: data.id }
}

/** Fire-and-forget update last_used_at. Nigdy nie throwuje. */
export async function touchPat(tokenId: string): Promise<void> {
  const svc = serviceClient()
  if (!svc) return
  try {
    await svc.from('api_tokens').update({ last_used_at: new Date().toISOString() }).eq('id', tokenId)
  } catch {
    /* swallow */
  }
}
