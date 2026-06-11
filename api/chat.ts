import type { VercelRequest, VercelResponse } from '@vercel/node'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'
import { MARKET, type MarketEntry } from '../src/data/market'

/**
 * Subskrypcik — agent czatu.
 *
 * Endpoint: POST /api/chat
 * Body: { messages: ChatMessage[] }
 * Auth: Bearer <supabase access_token> w nagłówku Authorization
 *
 * Streamuje odpowiedź jako tekstowy strumień (Transfer-Encoding: chunked).
 * Klient czyta `ReadableStream` i dokleja tokeny do ostatniej wiadomości AI.
 *
 * Limit: DAILY_MESSAGE_LIMIT (20) wiadomości / user / dzień (UTC).
 */

const DAILY_MESSAGE_LIMIT = 20
const MODEL = process.env.SUBSKRYPCIK_MODEL || 'gpt-4o-mini'

const SYSTEM_PROMPT = `Jesteś Subskrypcik — doradca subskrypcji w aplikacji "Ostatni Dzień".

ZASADY (BEZWZGLĘDNE):
1. NIGDY nie zaczynaj od powitania, "chętnie", "oczywiście", "rozumiem", "jasne".
2. Pierwsze słowo = konkretny fakt, liczba lub kwota.
3. Wszystkie kwoty w PLN, zawsze **pogrubione**.
4. Każda odpowiedź kończy się JEDNYM pytaniem-CTA (np. "Podać link?", "Rozbić to?").
5. Jeśli brak danych w narzędziu get_market_offer — powiedz wprost: "Nie mam aktualnych danych dla [X]." NIE wymyślaj cen.
6. Maks 4 zdania per odpowiedź, chyba że user prosi o porównanie/listę.
7. Używaj narzędzi PROAKTYWNIE:
   - pytania o subskrypcje usera → get_user_subscriptions
   - pytania o usługi z rynku (alternatywy, ceny, anulowanie) → get_market_offer
8. Język: polski. Formatowanie: Markdown (bold, listy).
9. Nie udzielaj porad prawnych ani finansowych. Doradzasz wyłącznie w temacie subskrypcji.

PRZYKŁAD STYLU:
U: "Jak zrezygnować ze Zdrofitu?"
AI: "Zdrofit wymaga **miesięcznego okresu wypowiedzenia** ze skutkiem na koniec miesiąca kalendarzowego. Składając dziś — zapłacisz za kolejny pełny miesiąc. Najbezpieczniej przez portal klienta (rezygnacje mailowe są procesowane z opóźnieniem). Podać link do formularza?"`

function findMarketOffer(query: string): MarketEntry | null {
  const q = query.toLowerCase().trim()
  if (!q) return null
  // dopasowanie po nazwie albo id, fallback po podciągu
  const exact = MARKET.find((m) => m.name.toLowerCase() === q || m.id === q)
  if (exact) return exact
  return MARKET.find((m) => m.name.toLowerCase().includes(q) || q.includes(m.name.toLowerCase())) || null
}

const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'get_user_subscriptions',
      description:
        'Zwraca listę aktywnych subskrypcji zalogowanego użytkownika z bazy: nazwa, kwota PLN, data następnego pobrania, typ (trial/renewal).',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_market_offer',
      description:
        'Zwraca aktualne plany cenowe, sposób anulowania i alternatywy dla konkretnej usługi z bazy rynkowej (np. Netflix, Spotify, Adobe CC, Zdrofit). Zwraca null jeśli brak danych.',
      parameters: {
        type: 'object',
        properties: {
          serviceName: {
            type: 'string',
            description: 'Nazwa usługi (np. "Netflix", "Spotify", "Adobe Creative Cloud").',
          },
        },
        required: ['serviceName'],
      },
    },
  },
]

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const openaiKey = process.env.OPENAI_API_KEY
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
  const supabaseAnon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

  if (!openaiKey || !supabaseUrl || !supabaseAnon) {
    res.status(500).json({ error: 'Brak konfiguracji serwera (env vars).' })
    return
  }

  // Auth: JWT z headera Authorization: Bearer <token>
  const auth = req.headers.authorization
  const token = auth?.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) {
    res.status(401).json({ error: 'Brak autoryzacji.' })
    return
  }

  // Klient supabase per-request z tokenem usera (respektuje RLS).
  const supabase = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: userData, error: userErr } = await supabase.auth.getUser(token)
  if (userErr || !userData.user) {
    res.status(401).json({ error: 'Nieprawidłowy token.' })
    return
  }
  const userId = userData.user.id

  // Rate limit: 20 / user / dzień (UTC date).
  const today = new Date().toISOString().slice(0, 10)
  const { data: usageRow } = await supabase
    .from('chat_daily_usage')
    .select('message_count')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle()

  const used = usageRow?.message_count ?? 0
  if (used >= DAILY_MESSAGE_LIMIT) {
    res.status(429).json({
      error: 'rate_limit',
      message: 'Wykorzystałeś dzienny limit pytań. Wrócę jutro.',
    })
    return
  }

  // Parse body.
  const body = req.body as { messages?: Array<{ role: 'user' | 'assistant'; content: string }> }
  const userMessages = body?.messages ?? []
  if (!userMessages.length) {
    res.status(400).json({ error: 'Brak wiadomości.' })
    return
  }

  // Inkrementacja licznika (upsert).
  await supabase.from('chat_daily_usage').upsert(
    { user_id: userId, date: today, message_count: used + 1 },
    { onConflict: 'user_id,date' },
  )

  // Pre-fetch listy do system message (oszczędza tool call na 80% pytań).
  const { data: subs } = await supabase
    .from('subscriptions')
    .select('name,amount_pln,date,type,days_until')
    .eq('user_id', userId)
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

  const contextMessage = `Aktualna data: ${today}.
Liczba aktywnych subskrypcji użytkownika: ${subs?.length ?? 0}.
Suma miesięczna (z listy poniżej): **${totalPLN} zł**.
Lista (snapshot, posortowana po najbliższym pobraniu):
${listSnapshot || '(pusta)'}`

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'system', content: contextMessage },
    ...userMessages,
  ]

  const openai = new OpenAI({ apiKey: openaiKey })

  // Headers dla streamingu.
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader('Cache-Control', 'no-cache, no-transform')
  res.setHeader('X-Accel-Buffering', 'no')

  try {
    // Pętla agentowa: max 3 iteracje (tool calls).
    for (let iteration = 0; iteration < 3; iteration++) {
      const stream = await openai.chat.completions.create({
        model: MODEL,
        messages,
        tools: TOOLS,
        tool_choice: 'auto',
        stream: true,
        temperature: 0.4,
      })

      let assistantContent = ''
      const toolCalls: Array<{ id: string; name: string; args: string }> = []

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta
        if (!delta) continue

        if (delta.content) {
          assistantContent += delta.content
          res.write(delta.content)
        }

        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index ?? 0
            if (!toolCalls[idx]) toolCalls[idx] = { id: '', name: '', args: '' }
            if (tc.id) toolCalls[idx].id = tc.id
            if (tc.function?.name) toolCalls[idx].name = tc.function.name
            if (tc.function?.arguments) toolCalls[idx].args += tc.function.arguments
          }
        }
      }

      if (toolCalls.length === 0) {
        // Koniec — model zakończył odpowiedź tekstem.
        break
      }

      // Wykonaj tool calls i dołącz wyniki do historii.
      messages.push({
        role: 'assistant',
        content: assistantContent || null,
        tool_calls: toolCalls.map((t) => ({
          id: t.id,
          type: 'function' as const,
          function: { name: t.name, arguments: t.args || '{}' },
        })),
      })

      for (const tc of toolCalls) {
        let result: unknown = null
        try {
          if (tc.name === 'get_user_subscriptions') {
            result = (subs ?? []).map((s) => ({
              name: s.name,
              amountPLN: s.amount_pln / 100,
              date: s.date,
              daysUntil: s.days_until,
              type: s.type,
            }))
          } else if (tc.name === 'get_market_offer') {
            const args = JSON.parse(tc.args || '{}') as { serviceName?: string }
            result = findMarketOffer(args.serviceName || '')
          }
        } catch (e) {
          result = { error: 'Tool execution failed' }
        }

        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        })
      }
    }

    res.end()
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    if (!res.headersSent) {
      res.status(500).json({ error: msg })
    } else {
      res.write(`\n\n[Błąd: ${msg}]`)
      res.end()
    }
  }
}
