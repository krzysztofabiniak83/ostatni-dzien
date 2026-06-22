import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'
import Stripe from 'stripe'

/**
 * POST /api/webhooks/stripe
 *
 * Endpoint webhooka Stripe. Słucha `checkout.session.completed`
 * i odblokowuje personę w `user_personas`.
 *
 * Klient Supabase: SERVICE ROLE (pisze poza RLS — webhook nie ma sesji usera).
 *
 * Idempotencja: `stripe_checkout_session_id` to unique index. Re-deliver
 * tego samego eventu nic nie zepsuje (`onConflict do nothing`).
 *
 * UWAGA: body MUSI być surowy (raw) do weryfikacji podpisu — wyłączamy
 * bodyParser i czytamy stream ręcznie.
 */
export const config = {
  api: {
    bodyParser: false,
  },
}

async function readRawBody(req: VercelRequest): Promise<Buffer> {
  const chunks: Buffer[] = []
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
  }
  return Buffer.concat(chunks)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' })
    return
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!stripeKey || !webhookSecret || !supabaseUrl || !serviceRoleKey) {
    console.error('[stripe-webhook] missing env vars')
    res.status(500).json({ error: 'server_misconfigured' })
    return
  }

  const sigHeader = req.headers['stripe-signature']
  const signature = Array.isArray(sigHeader) ? sigHeader[0] : sigHeader
  if (!signature) {
    res.status(400).json({ error: 'missing_signature' })
    return
  }

  const rawBody = await readRawBody(req)
  const stripe = new Stripe(stripeKey)

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'invalid signature'
    console.error('[stripe-webhook] signature verification failed:', msg)
    res.status(400).json({ error: 'invalid_signature', message: msg })
    return
  }

  if (event.type !== 'checkout.session.completed') {
    // Inne eventy ignorujemy ale ACK-ujemy żeby Stripe nie retry'ował.
    console.log(`[stripe-webhook] ignoring event=${event.type}`)
    res.status(200).json({ received: true })
    return
  }

  const session = event.data.object as Stripe.Checkout.Session
  const userId = session.client_reference_id
  const personaId = session.metadata?.persona_id
  const sessionId = session.id

  if (!userId || !personaId) {
    console.error(
      `[stripe-webhook] missing identifiers: userId=${userId} personaId=${personaId} session=${sessionId}`,
    )
    // 200 — nie ma sensu retry'ować, dane już są w Stripe.
    res.status(200).json({ received: true, skipped: 'missing_identifiers' })
    return
  }

  if (session.payment_status !== 'paid') {
    console.log(`[stripe-webhook] session=${sessionId} not paid (${session.payment_status})`)
    res.status(200).json({ received: true, skipped: 'unpaid' })
    return
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { error } = await supabase.from('user_personas').upsert(
    {
      user_id: userId,
      persona_id: personaId,
      source: 'stripe',
      stripe_checkout_session_id: sessionId,
      unlocked_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,persona_id', ignoreDuplicates: false },
  )

  if (error) {
    console.error(`[stripe-webhook] db upsert failed: ${error.message}`)
    res.status(500).json({ error: 'db_error', message: error.message })
    return
  }

  console.log(`[stripe-webhook] unlocked persona=${personaId} for user=${userId}`)
  res.status(200).json({ received: true, unlocked: personaId })
}
