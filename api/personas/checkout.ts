import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getUserFromRequest } from '../_shared/auth.js'

/**
 * POST /api/personas/checkout
 * Body: { personaId: string }
 *
 * Zwraca URL Payment Linka Stripe wzbogacony o:
 * - `client_reference_id=<userId>` — webhook po stronie Stripe użyje tego pola
 *   żeby przypisać entitlement do właściwego usera.
 * - `prefilled_email=<userEmail>` — wygoda, nie wymóg.
 *
 * Frontend redirektuje przez `window.location.assign(url)`.
 *
 * Sam Payment Link tworzymy ręcznie w Stripe Dashboardzie i wklejamy URL
 * do `personas.stripe_payment_link` — wraz z metadanymi `persona_id=<id>`,
 * które webhook czyta z `session.metadata`.
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

  const { data: persona, error } = await supabase
    .from('personas')
    .select('id,name,stripe_payment_link,is_free')
    .eq('id', personaId)
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    res.status(500).json({ error: 'db_error', message: error.message })
    return
  }
  if (!persona) {
    res.status(404).json({ error: 'not_found', message: 'Persona nie istnieje.' })
    return
  }
  if (persona.is_free) {
    res.status(400).json({ error: 'free_persona', message: 'Ta persona jest darmowa.' })
    return
  }
  if (!persona.stripe_payment_link) {
    res.status(503).json({ error: 'not_for_sale_yet', message: 'Sprzedaż jeszcze nieuruchomiona.' })
    return
  }

  // Email pobierzemy z auth.users przez Supabase (RLS pozwala na auth.uid()).
  const { data: userData } = await supabase.auth.getUser()
  const email = userData?.user?.email

  const url = new URL(persona.stripe_payment_link)
  url.searchParams.set('client_reference_id', userId)
  if (email) url.searchParams.set('prefilled_email', email)

  res.status(200).json({ url: url.toString() })
}
