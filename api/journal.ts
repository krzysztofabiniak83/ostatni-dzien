import type { VercelRequest, VercelResponse } from '@vercel/node'
import OpenAI from 'openai'
import { getUserFromRequest } from './_shared/auth.js'
import {
  CATEGORY_GUIDE_FOR_LLM,
  DEFAULT_CATEGORY,
  isCategoryId,
  type CategoryId,
} from './_shared/categories.js'

/**
 * Dzienniczek Rozmów — persystencja + odczyt.
 *
 * GET  /api/journal?from=YYYY-MM-DD&to=YYYY-MM-DD
 *   Zwraca konwersacje zalogowanego użytkownika dla zakresu dat (domyślnie ostatnie 60 dni).
 *
 * POST /api/journal/finalize  (POST /api/journal z body.action="finalize")
 *   Body: { messages: [...], startedAt: ISO, endedAt: ISO }
 *   - Gating: pomija sesje krótsze niż 4 wiadomości (hybryda — patrz CLAUDE.md / PROJECT_PLAN.md).
 *   - Wywołuje LLM (gpt-4o-mini) z promptem klasyfikującym+streszczającym → JSON
 *     { category, title, summary }.
 *   - INSERT do public.conversations.
 *   - Best-effort: błędy summarizera nie wracają do usera (200 + skipped).
 */

const SUMMARY_MODEL = process.env.SUBSKRYPCIK_SUMMARY_MODEL || 'gpt-4o-mini'
const MIN_MESSAGES_FOR_JOURNAL = 4

type ChatMessage = { role: 'user' | 'assistant'; content: string }

interface FinalizeBody {
  action: 'finalize'
  messages: ChatMessage[]
  startedAt: string
  endedAt: string
}

const SUMMARY_PROMPT = `Jesteś analitykiem rozmów. Dostajesz zapis konwersacji użytkownika z agentem-doradcą subskrypcji "Subskrypcik".

Zwróć WYŁĄCZNIE czysty JSON (bez markdown, bez code-fence) o strukturze:
{
  "category": <jedna z dozwolonych poniżej>,
  "title": "krótki tytuł (max 60 znaków, po polsku, bez kropki na końcu)",
  "summary": "2-3 zdania (max 300 znaków, po polsku) — o czym była rozmowa, jaki wniosek/decyzja zapadła"
}

${CATEGORY_GUIDE_FOR_LLM}

Tytuł ma być konkretny ("Netflix — czy podwyżka się opłaca", NIE "Rozmowa o subskrypcji").`

async function handleGet(req: VercelRequest, res: VercelResponse) {
  const ctx = await getUserFromRequest(req, res)
  if (!ctx) return
  const { supabase, userId } = ctx

  const url = new URL(req.url || '', 'http://x')
  const fromParam = url.searchParams.get('from')
  const toParam = url.searchParams.get('to')

  const now = new Date()
  const defaultFrom = new Date(now)
  defaultFrom.setDate(defaultFrom.getDate() - 60)
  const fromIso = (fromParam ? new Date(fromParam) : defaultFrom).toISOString()
  const toIso = (toParam ? new Date(toParam) : now).toISOString()

  const { data, error } = await supabase
    .from('conversations')
    .select('id,started_at,ended_at,category,title,summary,message_count')
    .eq('user_id', userId)
    .gte('started_at', fromIso)
    .lte('started_at', toIso)
    .order('started_at', { ascending: false })
    .limit(200)

  if (error) {
    res.status(500).json({ error: 'db_error', message: error.message })
    return
  }

  res.status(200).json({
    conversations: (data ?? []).map((c) => ({
      id: c.id,
      startedAt: c.started_at,
      endedAt: c.ended_at,
      category: c.category,
      title: c.title,
      summary: c.summary,
      messageCount: c.message_count,
    })),
  })
}

async function handlePost(req: VercelRequest, res: VercelResponse) {
  const ctx = await getUserFromRequest(req, res)
  if (!ctx) return
  const { supabase, userId } = ctx

  const body = req.body as Partial<FinalizeBody>
  if (body?.action !== 'finalize') {
    res.status(400).json({ error: 'bad_request', message: 'Brak action=finalize.' })
    return
  }

  const messages = (body.messages ?? []).filter(
    (m) => (m.role === 'user' || m.role === 'assistant') && m.content?.trim(),
  )

  // Gating "hybryda" — pomijamy krótkie sesje typu "hello".
  if (messages.length < MIN_MESSAGES_FOR_JOURNAL) {
    res.status(200).json({ skipped: true, reason: 'too_short', threshold: MIN_MESSAGES_FOR_JOURNAL })
    return
  }

  const startedAt = body.startedAt ? new Date(body.startedAt) : new Date()
  const endedAt = body.endedAt ? new Date(body.endedAt) : new Date()

  // Summary via LLM.
  const openaiKey = process.env.OPENAI_API_KEY
  if (!openaiKey) {
    res.status(500).json({ error: 'server_misconfigured' })
    return
  }
  const openai = new OpenAI({ apiKey: openaiKey })

  const transcript = messages
    .map((m) => `${m.role === 'user' ? 'USER' : 'AGENT'}: ${m.content}`)
    .join('\n')
    .slice(0, 12_000)

  let category: CategoryId = DEFAULT_CATEGORY
  let title = 'Rozmowa z Subskrypcikiem'
  let summary = 'Krótka konsultacja w sprawie subskrypcji.'

  try {
    const completion = await openai.chat.completions.create({
      model: SUMMARY_MODEL,
      messages: [
        { role: 'system', content: SUMMARY_PROMPT },
        { role: 'user', content: transcript },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    })
    const raw = completion.choices[0]?.message?.content ?? '{}'
    const parsed = JSON.parse(raw) as { category?: unknown; title?: unknown; summary?: unknown }
    if (isCategoryId(parsed.category)) category = parsed.category
    if (typeof parsed.title === 'string') title = parsed.title.slice(0, 60)
    if (typeof parsed.summary === 'string') summary = parsed.summary.slice(0, 300)
  } catch {
    // Best-effort — wciąż zapisujemy z domyślnymi wartościami.
  }

  const { data, error } = await supabase
    .from('conversations')
    .insert({
      user_id: userId,
      started_at: startedAt.toISOString(),
      ended_at: endedAt.toISOString(),
      category,
      title,
      summary,
      message_count: messages.length,
      raw_messages: messages,
    })
    .select('id,started_at,ended_at,category,title,summary,message_count')
    .single()

  if (error) {
    res.status(500).json({ error: 'db_error', message: error.message })
    return
  }

  res.status(200).json({
    ok: true,
    saved: {
      id: data.id,
      startedAt: data.started_at,
      endedAt: data.ended_at,
      category: data.category,
      title: data.title,
      summary: data.summary,
      messageCount: data.message_count,
    },
  })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') return handleGet(req, res)
  if (req.method === 'POST') return handlePost(req, res)
  res.status(405).json({ error: 'Method not allowed' })
}
