import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getUserFromRequest } from '../_shared/auth.js'

/**
 * GET /api/personas
 *
 * Zwraca:
 * - `personas`: katalog person (PUBLICZNA projekcja — BEZ system_prompt, nigdy nie leci do klienta).
 * - `owned`: lista persona_id które user ma odblokowane.
 * - `active`: aktualnie wybrana persona (default 'subskrypcik').
 *
 * Wszystko pod RLS klienta z Bearer userem.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method_not_allowed' })
    return
  }

  const ctx = await getUserFromRequest(req, res)
  if (!ctx) return
  const { supabase, userId } = ctx

  const [personasResult, ownedResult, settingsResult] = await Promise.all([
    supabase
      .from('personas')
      .select(
        'id,name,tagline,description,avatar_emoji,accent_color,price_pln_grosze,is_free,sort_order,is_active',
      )
      .eq('is_active', true)
      .order('sort_order', { ascending: true }),
    supabase.from('user_personas').select('persona_id').eq('user_id', userId),
    supabase.from('user_settings').select('active_persona_id').eq('user_id', userId).maybeSingle(),
  ])

  if (personasResult.error) {
    res.status(500).json({ error: 'db_error', message: personasResult.error.message })
    return
  }

  const owned = (ownedResult.data ?? []).map((r) => r.persona_id)
  const active = settingsResult.data?.active_persona_id ?? 'subskrypcik'

  res.status(200).json({
    personas: personasResult.data ?? [],
    owned,
    active,
  })
}
