import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getUserFromRequest } from '../_shared/auth.js'

/**
 * PATCH /api/subscriptions/[id]
 * Body: { status: 'cancelled' | 'paused' | 'active' }
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PATCH') {
    res.status(405).json({ error: 'method_not_allowed', message: 'Method not allowed' })
    return
  }

  const ctx = await getUserFromRequest(req, res)
  if (!ctx) return
  const { supabase, userId } = ctx

  const id = (req.query.id as string | undefined) ?? ''
  if (!id) {
    res.status(400).json({ error: 'missing_id', message: 'Brak id w ścieżce.' })
    return
  }

  const body = req.body as { status?: string }
  const status = body?.status
  if (status !== 'cancelled' && status !== 'paused' && status !== 'active') {
    res.status(400).json({
      error: 'invalid_status',
      message: 'status musi być jednym z: cancelled, paused, active.',
    })
    return
  }

  const { data: existing } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()

  if (!existing) {
    res.status(404).json({ error: 'not_found', message: 'Subskrypcja nie znaleziona.' })
    return
  }

  const { error: updErr } = await supabase
    .from('subscriptions')
    .update({ status })
    .eq('id', id)
    .eq('user_id', userId)

  if (updErr) {
    res.status(500).json({ error: 'update_failed', message: updErr.message })
    return
  }

  const { data: verify } = await supabase
    .from('subscriptions')
    .select('id,name,status')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()

  if (!verify || verify.status !== status) {
    res.status(500).json({ error: 'not_verified', message: 'Status nie został potwierdzony po UPDATE.' })
    return
  }

  res.status(200).json({ subscription: verify })
}
