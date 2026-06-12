import type { VercelRequest, VercelResponse } from '@vercel/node'
import OpenAI from 'openai'
import { MARKET, type MarketEntry } from './_market.js'
import { getUserFromRequest } from './_shared/auth.js'
import { checkAndIncrementDailyUsage } from './_shared/rate-limit.js'
import { formatSubDate, sectionFor, urgencyFor } from './_shared/format.js'
import { SYSTEM_PROMPT } from './_shared/prompt.js'
import { CATEGORY_IDS, isCategoryId } from './_shared/categories.js'

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

const MODEL = process.env.SUBSKRYPCIK_MODEL || 'gpt-4o-mini'

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
        'Dodaje nową subskrypcję do bazy zalogowanego użytkownika. Używaj gdy user prosi o "dodaj/zapisz/wpisz". Kwota od usera jest święta — NIE zastępuj jej cennikiem z pamięci. Domyślnie type=renewal, cykl miesięczny, daysUntil=0 (dziś), waluta PLN. WYMAGANE pole category — wybierz dokładnie jedną z 7 wartości taksonomii Ostatni Dzień. Tool sam tworzy id, formatuje datę, oblicza section/urgency i weryfikuje zapis SELECT-em.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Nazwa usługi (np. "Netflix Podstawowy").' },
          amountPLN: { type: 'number', description: 'Kwota w PLN, np. 29 lub 29.99. Jeżeli user podał EUR/USD — przelicz (1 EUR ≈ 4.28 PLN, 1 USD ≈ 3.97 PLN) i wspomnij o przeliczeniu w odpowiedzi.' },
          category: {
            type: 'string',
            enum: [...CATEGORY_IDS],
            description:
              'WYMAGANE. Kategoria taksonomii Ostatni Dzień — wybierz dokładnie jedną: media_vod (Netflix/HBO/Disney+/Player/Canal+/YouTube Premium), audio_podcasts (Spotify/Apple Music/Tidal/Audible/Storytel), design_creative (Figma/Adobe CC/Canva/Framer/Affinity), ai_tools (ChatGPT/Claude/Midjourney/Gemini/Copilot/Cursor), productivity_cloud (Notion/Slack/Google Workspace/iCloud/Dropbox/1Password/NordVPN/menedżery haseł/VPN), shopping_gaming (Amazon Prime/Allegro Smart/Xbox Game Pass/PS Plus/Nintendo Online), other (fitness/edukacja/zdrowie/inne).',
          },
          daysUntil: { type: 'integer', description: 'Liczba dni od dziś do następnego pobrania. 0 = dziś (default).', default: 0 },
          type: { type: 'string', enum: ['trial', 'renewal'], description: 'trial tylko przy wyraźnym sygnale ("okres próbny", "darmowy miesiąc"). Default: renewal.', default: 'renewal' },
        },
        required: ['name', 'amountPLN', 'category'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_subscription',
      description:
        'FIZYCZNIE kasuje wiersz/wiersze z tabeli subscriptions (nieodwracalne). Używaj TYLKO gdy user mówi wprost "usuń/skasuj/wyrzuć". Dla "anuluj/zrezygnowałem" użyj change_subscription_status. Tryby: id (konkretny wiersz), nameQuery (najpierw 1 dopasowanie lub all=true), last=true (najnowszy wiersz usera). Tool weryfikuje SELECT-em że wierszy już nie ma.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Dokładne id (z get_user_subscriptions).' },
          nameQuery: { type: 'string', description: 'Fragment nazwy (case-insensitive) do dopasowania.' },
          last: { type: 'boolean', description: 'true = usuń najnowszy wiersz usera (po created_at).' },
          all: { type: 'boolean', description: 'true = przy nameQuery skasuj WSZYSTKIE dopasowania (gdy user mówi "wszystkie X"). false (default) = wymaga pojedynczego dopasowania.' },
        },
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
  if (!openaiKey) {
    res.status(500).json({ error: 'Brak konfiguracji serwera (env vars).' })
    return
  }

  const ctx = await getUserFromRequest(req, res)
  if (!ctx) return
  const { supabase, userId } = ctx

  // Parse body.
  const body = req.body as { messages?: Array<{ role: 'user' | 'assistant'; content: string }> }
  const userMessages = body?.messages ?? []
  if (!userMessages.length) {
    res.status(400).json({ error: 'Brak wiadomości.' })
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
              category?: string
              daysUntil?: number
              type?: 'trial' | 'renewal'
            }
            const name = (args.name || '').trim()
            if (!name || typeof args.amountPLN !== 'number') {
              result = { error: 'Brakuje nazwy lub kwoty.' }
            } else if (!isCategoryId(args.category)) {
              result = {
                error: `Brakuje kategorii lub niedozwolona wartość. Wymagane: jeden z ${CATEGORY_IDS.join(', ')}.`,
              }
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
                category: args.category,
              })
              if (insErr) {
                result = { error: `INSERT nieudany: ${insErr.message}` }
              } else {
                const { data: verify } = await supabase
                  .from('subscriptions')
                  .select('id,name,amount_pln,date,days_until,type,status,category')
                  .eq('id', id)
                  .eq('user_id', userId)
                  .maybeSingle()
                result = verify
                  ? { ok: true, saved: verify }
                  : { error: 'Wiersz nie znaleziony po INSERT — operacja nie potwierdzona.' }
              }
            }
          } else if (tc.name === 'delete_subscription') {
            const args = JSON.parse(tc.args || '{}') as {
              id?: string
              nameQuery?: string
              last?: boolean
              all?: boolean
            }
            let targets: { id: string; name: string }[] = []
            if (args.id) {
              const { data } = await supabase
                .from('subscriptions')
                .select('id,name')
                .eq('user_id', userId)
                .eq('id', args.id)
              targets = data ?? []
            } else if (args.last) {
              const { data } = await supabase
                .from('subscriptions')
                .select('id,name')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(1)
              targets = data ?? []
            } else if (args.nameQuery) {
              const { data } = await supabase
                .from('subscriptions')
                .select('id,name')
                .eq('user_id', userId)
                .ilike('name', `%${args.nameQuery}%`)
              const matches = data ?? []
              if (matches.length === 0) {
                result = { error: `Brak subskrypcji pasującej do "${args.nameQuery}".` }
              } else if (matches.length > 1 && !args.all) {
                result = {
                  error: 'Wiele dopasowań — doprecyzuj (id) albo potwierdź "wszystkie".',
                  candidates: matches,
                }
              } else {
                targets = matches
              }
            } else {
              result = { error: 'Podaj id, nameQuery albo last=true.' }
            }
            if (targets.length > 0 && !(result as { error?: string } | null)?.error) {
              const ids = targets.map((t) => t.id)
              const { error: delErr } = await supabase
                .from('subscriptions')
                .delete()
                .eq('user_id', userId)
                .in('id', ids)
              if (delErr) {
                result = { error: `DELETE nieudany: ${delErr.message}` }
              } else {
                // Weryfikacja: żaden z ids nie powinien istnieć.
                const { data: leftover } = await supabase
                  .from('subscriptions')
                  .select('id')
                  .eq('user_id', userId)
                  .in('id', ids)
                if (leftover && leftover.length > 0) {
                  result = { error: 'Nie wszystkie wiersze zostały skasowane.', leftover }
                } else {
                  result = { ok: true, deleted: targets }
                }
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
