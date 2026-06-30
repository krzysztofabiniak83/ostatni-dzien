import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getUserFromRequest } from './_shared/auth.js'
import { generatePat } from './_shared/api-tokens.js'

/**
 * CRUD dla Personal Access Tokenów.
 * Wymaga autoryzacji sesyjnym JWT Supabase (PAT-em nie tworzymy kolejnych PAT-ów).
 *
 *  GET    /api/tokens              → lista (bez raw — tylko prefix + meta)
 *  POST   /api/tokens              → { name, expiresInDays? } → { token, ...meta } (raw zwracany RAZ)
 *  DELETE /api/tokens?id=<uuid>    → revoke (soft-delete via revoked_at)
 */

export const config = { runtime: 'nodejs' }

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const ctx = await getUserFromRequest(req, res)
  if (!ctx) return
  const { supabase, userId } = ctx

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('api_tokens')
      .select('id, name, token_prefix, created_at, last_used_at, revoked_at, expires_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) {
      res.status(500).json({ error: 'db_error', message: error.message })
      return
    }
    res.status(200).json({ tokens: data ?? [] })
    return
  }

  if (req.method === 'POST') {
    const body = (req.body ?? {}) as { name?: string; expiresInDays?: number }
    const name = (body.name ?? '').trim()
    if (!name || name.length > 80) {
      res.status(400).json({ error: 'invalid_body', message: 'Pole `name` (1–80 znaków) jest wymagane.' })
      return
    }
    const expiresInDays = body.expiresInDays
    const expires_at =
      typeof expiresInDays === 'number' && expiresInDays > 0
        ? new Date(Date.now() + expiresInDays * 86_400_000).toISOString()
        : null

    const { raw, hash, preview } = generatePat()
    const { data, error } = await supabase
      .from('api_tokens')
      .insert({
        user_id: userId,
        name,
        token_hash: hash,
        token_prefix: preview,
        expires_at,
      })
      .select('id, name, token_prefix, created_at, expires_at')
      .single()
    if (error || !data) {
      res.status(500).json({ error: 'db_error', message: error?.message ?? 'Insert failed.' })
      return
    }
    // RAW token zwracany TYLKO TUTAJ — nigdzie więcej nie istnieje w postaci jawnej.
    res.status(201).json({ token: raw, ...data })
    return
  }

  if (req.method === 'DELETE') {
    const id = (req.query.id as string | undefined) ?? ''
    if (!id) {
      res.status(400).json({ error: 'invalid_query', message: 'Wymagane: ?id=<uuid>.' })
      return
    }
    const { error } = await supabase
      .from('api_tokens')
      .update({ revoked_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('id', id)
      .is('revoked_at', null)
    if (error) {
      res.status(500).json({ error: 'db_error', message: error.message })
      return
    }
    res.status(204).end()
    return
  }

  res.setHeader('Allow', 'GET, POST, DELETE')
  res.status(405).json({ error: 'method_not_allowed' })
}
