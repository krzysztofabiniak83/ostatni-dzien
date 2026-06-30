import type { VercelRequest, VercelResponse } from '@vercel/node'
import OpenAI from 'openai'
import { getUserFromRequest } from './_shared/auth.js'
import { checkAndIncrementDailyUsage, checkPerMinuteRate, PER_MINUTE_LIMIT } from './_shared/rate-limit.js'
import { getActiveSystemPrompt } from './_shared/personas.js'

const MODEL = process.env.SUBSKRYPCIK_MODEL || 'gpt-4o-mini'

/**
 * POST /api/ask
 * Body: { question: string, includeSubscriptions?: boolean }
 * Response: { answer: string }
 *
 * One-shot Q&A do Subskrypcika — bez streamingu i bez tooli modyfikujących bazę.
 * Liczy się do wspólnego limitu 20/dzień (chat_daily_usage).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed', message: 'Method not allowed' })
    return
  }

  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) {
    res.status(500).json({ error: 'server_misconfigured', message: 'Brak OPENAI_API_KEY.' })
    return
  }

  const ctx = await getUserFromRequest(req, res)
  if (!ctx) return
  const { supabase, userId } = ctx

  const body = req.body as { question?: string; includeSubscriptions?: boolean }
  const question = (body?.question ?? '').trim()
  if (!question) {
    res.status(400).json({ error: 'invalid_body', message: 'Wymagane: question (string, niepuste).' })
    return
  }

  const perMin = checkPerMinuteRate(userId)
  if (!perMin.ok) {
    const retryAfter = Math.ceil(perMin.resetMs / 1000)
    res.setHeader('Retry-After', String(retryAfter))
    res.status(429).json({
      error: 'rate_limit_minute',
      message: `Za dużo zapytań — limit ${PER_MINUTE_LIMIT}/min. Spróbuj za ${retryAfter}s.`,
    })
    return
  }

  const rl = await checkAndIncrementDailyUsage(supabase, userId)
  if (!rl.ok) {
    res.status(429).json({
      error: 'rate_limit',
      message: 'Wykorzystałeś dzienny limit pytań. Wrócę jutro.',
    })
    return
  }

  const today = new Date().toISOString().slice(0, 10)
  const { personaId, prompt: systemPrompt } = await getActiveSystemPrompt(supabase, userId)
  console.log(`[ask] persona=${personaId}`)
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt },
  ]

  if (body.includeSubscriptions) {
    const { data: subs } = await supabase
      .from('subscriptions')
      .select('name,amount_pln,date,type,days_until,status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('days_until', { ascending: true })
      .limit(30)

    const totalGroszy = (subs ?? []).reduce((sum, s) => sum + (s.amount_pln || 0), 0)
    const totalPLN = (totalGroszy / 100).toFixed(2).replace('.', ',')
    const listSnapshot = (subs ?? [])
      .map(
        (s) =>
          `- ${s.name} · ${(s.amount_pln / 100).toFixed(2).replace('.', ',')} zł · ${s.type === 'trial' ? 'trial' : 'odnowienie'} · ${s.date}`,
      )
      .join('\n')

    messages.push({
      role: 'system',
      content: `Aktualna data: ${today}.
Liczba aktywnych subskrypcji użytkownika: ${subs?.length ?? 0}.
Suma miesięczna (z listy poniżej): **${totalPLN} zł**.
Lista (snapshot, posortowana po najbliższym pobraniu):
${listSnapshot || '(pusta)'}`,
    })
  }

  messages.push({ role: 'user', content: question })

  const openai = new OpenAI({ apiKey: openaiKey })

  try {
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages,
      temperature: 0.4,
    })
    const answer = completion.choices[0]?.message?.content ?? ''
    res.status(200).json({ answer })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    res.status(500).json({ error: 'openai_failed', message: msg })
  }
}
