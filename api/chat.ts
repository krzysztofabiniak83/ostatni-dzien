import type { VercelRequest, VercelResponse } from '@vercel/node'
import OpenAI from 'openai'
import { createClient } from '@supabase/supabase-js'
import { MARKET, type MarketEntry } from './_market.js'

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
   - "dodaj X za Y zł", "zapisz", "wpisz nową" → add_subscription (domyślnie miesięczny renewal, data startu = dziś)
   - "anuluj X", "zapauzuj X", "wznów X", "zrezygnowałem z X" → change_subscription_status
8. Język: polski. Formatowanie: Markdown (bold, listy).
9. Nie udzielaj porad prawnych ani finansowych. Doradzasz wyłącznie w temacie subskrypcji.
10. ZARZĄDZANIE SUBSKRYPCJAMI — zasady bezwzględne:
    - Kwota, data i nazwa pochodzą z wiadomości usera. NIE zastępuj ich "aktualną wiedzą" o cenniku (np. "Netflix kosztuje teraz 37 zł" — zabronione, nawet jeżeli tak myślisz). User napisał 29 zł → użyj 29 zł.
    - Jeżeli user nie podał kwoty przy dodawaniu — DOPYTAJ, nie zgaduj z pamięci.
    - Przy change_subscription_status najpierw użyj get_user_subscriptions, dopasuj po nazwie case-insensitive (skróty i literówki OK). Jeżeli pasuje wiele lub zero — powiedz to wprost i poproś o doprecyzowanie.
    - Po każdej zmianie potwierdź krótko co zaszło (nazwa + kwota/data albo nazwa + nowy status). Tool sam weryfikuje zapis — jeżeli zwróci błąd, powiedz to userowi, nie udawaj sukcesu.

PRZYKŁAD STYLU:
U: "Jak zrezygnować ze Zdrofitu?"
AI: "Zdrofit wymaga **miesięcznego okresu wypowiedzenia** ze skutkiem na koniec miesiąca kalendarzowego. Składając dziś — zapłacisz za kolejny pełny miesiąc. Najbezpieczniej przez portal klienta (rezygnacje mailowe są procesowane z opóźnieniem). Podać link do formularza?"`

const POLISH_MONTHS = [
  'stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca',
  'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia',
]

/** Format "Dziś · 9:00" / "2 czerwca · 9:00" zgodny z resztą bazy. */
function formatSubDate(daysUntil: number): string {
  const d = new Date()
  d.setDate(d.getDate() + Math.max(0, daysUntil))
  if (daysUntil <= 0) return 'Dziś · 9:00'
  return `${d.getDate()} ${POLISH_MONTHS[d.getMonth()]} · 9:00`
}

function sectionFor(daysUntil: number): 'today' | 'week' | 'month' | 'later' {
  if (daysUntil <= 0) return 'today'
  if (daysUntil <= 7) return 'week'
  if (daysUntil <= 31) return 'month'
  return 'later'
}

function urgencyFor(daysUntil: number): 'today' | 'critical' | 'normal' {
  if (daysUntil <= 0) return 'today'
  if (daysUntil <= 3) return 'critical'
  return 'normal'
}

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
      name: 'add_subscription',
      description:
        'Dodaje nową subskrypcję do bazy zalogowanego użytkownika. Używaj gdy user prosi o "dodaj/zapisz/wpisz". Kwota od usera jest święta — NIE zastępuj jej cennikiem z pamięci. Domyślnie type=renewal, cykl miesięczny, daysUntil=0 (dziś), waluta PLN. Tool sam tworzy id, formatuje datę, oblicza section/urgency i weryfikuje zapis SELECT-em.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Nazwa usługi (np. "Netflix Podstawowy").' },
          amountPLN: { type: 'number', description: 'Kwota w PLN, np. 29 lub 29.99. Jeżeli user podał EUR/USD — przelicz (1 EUR ≈ 4.28 PLN, 1 USD ≈ 3.97 PLN) i wspomnij o przeliczeniu w odpowiedzi.' },
          daysUntil: { type: 'integer', description: 'Liczba dni od dziś do następnego pobrania. 0 = dziś (default).', default: 0 },
          type: { type: 'string', enum: ['trial', 'renewal'], description: 'trial tylko przy wyraźnym sygnale ("okres próbny", "darmowy miesiąc"). Default: renewal.', default: 'renewal' },
        },
        required: ['name', 'amountPLN'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'change_subscription_status',
      description:
        'Zmienia status istniejącej subskrypcji usera: cancelled (anulowana), paused (zapauzowana), active (wznowiona). Przyjmuje albo id (gdy znasz dokładnie) albo nameQuery (dopasowanie po fragmencie nazwy). Tool sam weryfikuje zmianę SELECT-em po UPDATE.',
      parameters: {
        type: 'object',
        properties: {
          nameQuery: { type: 'string', description: 'Fragment nazwy usługi do dopasowania (np. "netflix", "chat"). Case-insensitive.' },
          id: { type: 'string', description: 'Dokładne id wiersza (z get_user_subscriptions). Użyj gdy nameQuery jest niejednoznaczny.' },
          newStatus: { type: 'string', enum: ['cancelled', 'paused', 'active'], description: 'Docelowy status.' },
        },
        required: ['newStatus'],
      },
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
          } else if (tc.name === 'add_subscription') {
            const args = JSON.parse(tc.args || '{}') as {
              name?: string
              amountPLN?: number
              daysUntil?: number
              type?: 'trial' | 'renewal'
            }
            const name = (args.name || '').trim()
            if (!name || typeof args.amountPLN !== 'number') {
              result = { error: 'Brakuje nazwy lub kwoty.' }
            } else {
              const daysUntil = Math.max(0, Math.floor(args.daysUntil ?? 0))
              const subType = args.type === 'trial' ? 'trial' : 'renewal'
              const amount_pln = Math.round(args.amountPLN * 100)
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
              })
              if (insErr) {
                result = { error: `INSERT nieudany: ${insErr.message}` }
              } else {
                const { data: verify } = await supabase
                  .from('subscriptions')
                  .select('id,name,amount_pln,date,days_until,type,status')
                  .eq('id', id)
                  .eq('user_id', userId)
                  .maybeSingle()
                result = verify
                  ? { ok: true, saved: verify }
                  : { error: 'Wiersz nie znaleziony po INSERT — operacja nie potwierdzona.' }
              }
            }
          } else if (tc.name === 'change_subscription_status') {
            const args = JSON.parse(tc.args || '{}') as {
              nameQuery?: string
              id?: string
              newStatus?: 'cancelled' | 'paused' | 'active'
            }
            if (!args.newStatus) {
              result = { error: 'Brak newStatus.' }
            } else {
              let targetId = args.id
              if (!targetId && args.nameQuery) {
                const q = `%${args.nameQuery.toLowerCase()}%`
                const { data: matches } = await supabase
                  .from('subscriptions')
                  .select('id,name,status')
                  .eq('user_id', userId)
                  .ilike('name', q)
                if (!matches || matches.length === 0) {
                  result = { error: `Brak subskrypcji pasującej do "${args.nameQuery}".` }
                } else if (matches.length > 1) {
                  result = {
                    error: 'Wiele dopasowań — podaj id.',
                    candidates: matches,
                  }
                } else {
                  targetId = matches[0].id
                }
              }
              if (targetId && !(result as { error?: string } | null)?.error) {
                const { error: updErr } = await supabase
                  .from('subscriptions')
                  .update({ status: args.newStatus })
                  .eq('id', targetId)
                  .eq('user_id', userId)
                if (updErr) {
                  result = { error: `UPDATE nieudany: ${updErr.message}` }
                } else {
                  const { data: verify } = await supabase
                    .from('subscriptions')
                    .select('id,name,status')
                    .eq('id', targetId)
                    .eq('user_id', userId)
                    .maybeSingle()
                  result = verify && verify.status === args.newStatus
                    ? { ok: true, updated: verify }
                    : { error: 'Status nie został zmieniony — weryfikacja nie potwierdziła.' }
                }
              } else if (!targetId && !(result as { error?: string } | null)?.error) {
                result = { error: 'Podaj nameQuery lub id.' }
              }
            }
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
