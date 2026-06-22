import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getUserFromRequest } from '../_shared/auth.js'

/**
 * POST /api/personas/activate
 * Body: { personaId: string }
 *
 * Ustawia `user_settings.active_persona_id` po sprawdzeniu że user ma
 * tę personę w `user_personas` (RLS sam by to wymusił, ale weryfikujemy
 * jawnie żeby dać 403 zamiast cichego no-op).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' })
    return
  }

  const ctx = await getUserFromRequest(req, res)
  if (!ctx) return
  const { supabase, userId } = ctx

  const personaId = (req.body as { personaId?: string })?.personaId?.trim()
  if (!personaId) {
    res.status(400).json({ error: 'invalid_body', message: 'Wymagane: personaId.' })
    return
  }

  const { data: entitlement } = await supabase
    .from('user_personas')
    .select('persona_id')
    .eq('persona_id', personaId)
    .maybeSingle()

  if (!entitlement) {
    res.status(403).json({ error: 'not_owned', message: 'Nie masz dostępu do tej persony.' })
    return
  }

  // Upsert — większość userów ma już wiersz z innymi ustawieniami; nowi nie.
  const { error } = await supabase
    .from('user_settings')
    .upsert(
      { user_id: userId, active_persona_id: personaId, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    )

  if (error) {
    res.status(500).json({ error: 'db_error', message: error.message })
    return
  }

  res.status(200).json({ activePersonaId: personaId })
}
