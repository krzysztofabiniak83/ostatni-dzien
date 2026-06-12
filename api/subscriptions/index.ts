import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getUserFromRequest } from '../_shared/auth.js'
import { formatSubDate, sectionFor, urgencyFor } from '../_shared/format.js'
import {
  CATEGORY_IDS,
  DEFAULT_CATEGORY,
  isCategoryId,
} from '../_shared/categories.js'

/**
 * GET  /api/subscriptions  → lista active + paused usera.
 * POST /api/subscriptions  → dodaje nową (domyślnie renewal, miesięczna, daysUntil=0).
 *
 * Auth: Bearer <supabase access_token>.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed', message: 'Method not allowed' })
    return
  }

  const ctx = await getUserFromRequest(req, res)
  if (!ctx) return
  const { supabase, userId } = ctx

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('id,name,amount_pln,date,days_until,type,status,category')
      .eq('user_id', userId)
      .in('status', ['active', 'paused'])
      .order('days_until', { ascending: true })

    if (error) {
      res.status(500).json({ error: 'db_error', message: error.message })
      return
    }

    res.status(200).json({
      subscriptions: (data ?? []).map((s) => ({
        id: s.id,
        name: s.name,
        amountPLN: s.amount_pln / 100,
        date: s.date,
        daysUntil: s.days_until,
        type: s.type,
        status: s.status,
        category: s.category,
      })),
    })
    return
  }

  // POST
  const body = req.body as {
    name?: string
    amountPLN?: number
    daysUntil?: number
    type?: 'trial' | 'renewal'
    category?: string
  }

  const name = (body?.name ?? '').trim()
  const amountPLN = typeof body?.amountPLN === 'number' ? body.amountPLN : NaN
  if (!name || !Number.isFinite(amountPLN) || amountPLN <= 0) {
    res.status(400).json({
      error: 'invalid_body',
      message: 'Wymagane: name (string, niepuste) oraz amountPLN (number > 0).',
    })
    return
  }
  // category opcjonalne (legacy clients) — domyślnie 'other'. Jeśli podane, musi być z listy.
  if (body.category !== undefined && !isCategoryId(body.category)) {
    res.status(400).json({
      error: 'invalid_body',
      message: `category musi być jedną z: ${CATEGORY_IDS.join(', ')}.`,
    })
    return
  }
  const category = isCategoryId(body.category) ? body.category : DEFAULT_CATEGORY

  const daysUntil = Math.max(0, Math.floor(body.daysUntil ?? 0))
  const subType: 'trial' | 'renewal' = body.type === 'trial' ? 'trial' : 'renewal'
  const amount_pln = Math.round(amountPLN * 100)
  const id = `user-${Date.now()}`
  const period = subType === 'trial' ? 'po próbie, potem miesięcznie' : 'miesięcznie'
  const periodShort = subType === 'trial' ? 'po próbie' : 'miesięcznie'

  const { error: insErr } = await supabase.from('subscriptions').insert({
    id,
    user_id: userId,
    name,
    logo_class: null,
    logo_text: (name[0] || '?').toUpperCase(),
    days_until: daysUntil,
    date: formatSubDate(daysUntil),
    amount_pln,
    period,
    period_short: periodShort,
    type: subType,
    urgency: urgencyFor(daysUntil),
    section: sectionFor(daysUntil),
    chart_heights: [0, 0, 0, 0, 0, 4],
    chart_total_pln: 0,
    status: 'active',
    category,
  })

  if (insErr) {
    res.status(500).json({ error: 'insert_failed', message: insErr.message })
    return
  }

  const { data: verify } = await supabase
    .from('subscriptions')
    .select('id,name,amount_pln,date,days_until,type,status,category')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle()

  if (!verify) {
    res.status(500).json({ error: 'not_verified', message: 'Wiersz nie znaleziony po INSERT.' })
    return
  }

  res.status(201).json({
    subscription: {
      id: verify.id,
      name: verify.name,
      amountPLN: verify.amount_pln / 100,
      date: verify.date,
      daysUntil: verify.days_until,
      type: verify.type,
      status: verify.status,
      category: verify.category,
    },
  })
}
