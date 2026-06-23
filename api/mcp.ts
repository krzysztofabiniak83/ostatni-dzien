import { createMcpHandler, withMcpAuth } from 'mcp-handler'
import { z } from 'zod'
import { authenticateToken, type AuthedContext } from './_shared/auth.js'
import { formatSubDate, sectionFor, urgencyFor } from './_shared/format.js'
import { CATEGORY_IDS } from './_shared/categories.js'

/**
 * MCP server (Streamable HTTP) — `/api/mcp`.
 * Reużywa tej samej autoryzacji co REST: Bearer = Supabase access_token.
 * Trzy toole CRUD — bez `ask_agent`, żeby nie wlatywały w limit /api/ask.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'

export const config = { runtime: 'nodejs' }

type ToolResult = {
  content: { type: 'text'; text: string }[]
  isError?: boolean
}

const ok = (data: unknown): ToolResult => ({
  content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
})

const fail = (message: string): ToolResult => ({
  content: [{ type: 'text', text: message }],
  isError: true,
})

async function withAuthCtx(
  token: string | undefined,
  fn: (ctx: AuthedContext) => Promise<ToolResult>,
): Promise<ToolResult> {
  const result = await authenticateToken(token ?? null)
  if (!result.ok) return fail(`${result.error}: ${result.message}`)
  return fn(result.ctx)
}

const baseHandler = createMcpHandler(
  (server) => {
    server.tool(
      'list_subscriptions',
      'Zwraca aktywne i zapauzowane subskrypcje zalogowanego użytkownika, posortowane po dniach do najbliższego pobrania.',
      {},
      async (_args, extra) => {
        return withAuthCtx(extra.authInfo?.token, async ({ supabase, userId }) => {
          const { data, error } = await supabase
            .from('subscriptions')
            .select('id,name,amount_pln,date,days_until,type,status,category')
            .eq('user_id', userId)
            .in('status', ['active', 'paused'])
            .order('days_until', { ascending: true })
          if (error) return fail(`db_error: ${error.message}`)
          return ok({
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
        })
      },
    )

    server.tool(
      'add_subscription',
      'Dodaje nową subskrypcję dla zalogowanego użytkownika. Domyślnie typ "renewal", miesięczna, daysUntil=0. WYMAGANE pole `category` — wybierz dokładnie jedną z 7 wartości taksonomii Ostatni Dzień: media_vod (Netflix/HBO/Disney+), audio_podcasts (Spotify/Apple Music/Audible), design_creative (Figma/Adobe/Canva), ai_tools (ChatGPT/Claude/Midjourney), productivity_cloud (Notion/Slack/iCloud/1Password/VPN), shopping_gaming (Prime/Xbox/PlayStation), other (fitness/edukacja/inne).',
      {
        name: z.string().min(1).describe('Nazwa usługi, np. "Netflix Podstawowy".'),
        amountPLN: z.number().positive().describe('Kwota miesięczna w PLN (może mieć ułamek).'),
        category: z
          .enum(CATEGORY_IDS)
          .describe('Kategoria taksonomii Ostatni Dzień (jedna z 7). Wymagana.'),
        daysUntil: z.number().int().min(0).optional().describe('Dni do najbliższego pobrania. Domyślnie 0.'),
        type: z.enum(['trial', 'renewal']).optional().describe('Domyślnie "renewal".'),
      },
      async ({ name, amountPLN, category, daysUntil, type }, extra) => {
        return withAuthCtx(extra.authInfo?.token, async ({ supabase, userId }) => {
          const trimmedName = name.trim()
          if (!trimmedName) return fail('invalid_body: name nie może być pusty')

          const d = Math.max(0, Math.floor(daysUntil ?? 0))
          const subType: 'trial' | 'renewal' = type === 'trial' ? 'trial' : 'renewal'
          const amount_pln = Math.round(amountPLN * 100)
          const id = `user-${Date.now()}`
          const period = subType === 'trial' ? 'po próbie, potem miesięcznie' : 'miesięcznie'
          const periodShort = subType === 'trial' ? 'po próbie' : 'miesięcznie'

          const { error: insErr } = await supabase.from('subscriptions').insert({
            id,
            user_id: userId,
            name: trimmedName,
            logo_class: null,
            logo_text: (trimmedName[0] || '?').toUpperCase(),
            days_until: d,
            date: formatSubDate(d),
            amount_pln,
            period,
            period_short: periodShort,
            type: subType,
            urgency: urgencyFor(d),
            section: sectionFor(d),
            chart_heights: [0, 0, 0, 0, 0, 4],
            chart_total_pln: 0,
            status: 'active',
            category,
          })
          if (insErr) return fail(`insert_failed: ${insErr.message}`)

          const { data: verify } = await supabase
            .from('subscriptions')
            .select('id,name,amount_pln,date,days_until,type,status,category')
            .eq('id', id)
            .eq('user_id', userId)
            .maybeSingle()
          if (!verify) return fail('not_verified: wiersz nie znaleziony po INSERT')

          return ok({
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
        })
      },
    )

    server.tool(
      'update_subscription_status',
      'Zmienia status istniejącej subskrypcji ("active" | "paused" | "cancelled"). Nie usuwa wiersza z bazy.',
      {
        id: z.string().min(1).describe('Identyfikator subskrypcji (z list_subscriptions).'),
        status: z.enum(['active', 'paused', 'cancelled']).describe('Docelowy status.'),
      },
      async ({ id, status }, extra) => {
        return withAuthCtx(extra.authInfo?.token, async ({ supabase, userId }) => {
          const { data: existing } = await supabase
            .from('subscriptions')
            .select('id')
            .eq('id', id)
            .eq('user_id', userId)
            .maybeSingle()
          if (!existing) return fail('not_found: subskrypcja nie znaleziona')

          const { error: updErr } = await supabase
            .from('subscriptions')
            .update({ status })
            .eq('id', id)
            .eq('user_id', userId)
          if (updErr) return fail(`update_failed: ${updErr.message}`)

          const { data: verify } = await supabase
            .from('subscriptions')
            .select('id,name,status')
            .eq('id', id)
            .eq('user_id', userId)
            .maybeSingle()
          if (!verify || verify.status !== status) return fail('not_verified: status nie potwierdzony')

          return ok({ subscription: verify })
        })
      },
    )

    server.tool(
      'list_journal_entries',
      'Zwraca dzienniczek rozmów zalogowanego użytkownika z agentem-Subskrypcikiem (tytuł, podsumowanie 2-3 zdania, kategoria, czas trwania, liczba dołączonych zdjęć). Użyj gdy potrzebujesz długoterminowej pamięci: "o czym rozmawialiśmy w zeszłym tygodniu", "co zdecydowaliśmy z Netflixem". Domyślnie ostatnie 60 dni, max 100 wpisów, sort malejąco po dacie.',
      {
        from: z
          .string()
          .optional()
          .describe('ISO 8601 (np. "2026-05-01T00:00:00Z"). Default: 60 dni temu.'),
        to: z.string().optional().describe('ISO 8601. Default: teraz.'),
        category: z
          .enum(CATEGORY_IDS)
          .optional()
          .describe(
            'Filtr po kategorii. Dozwolone: media_vod, audio_podcasts, design_creative, ai_tools, productivity_cloud, shopping_gaming, other.',
          ),
        limit: z.number().int().min(1).max(100).optional().describe('Max liczba wpisów (default 50).'),
      },
      async ({ from, to, category, limit }, extra) => {
        return withAuthCtx(extra.authInfo?.token, async ({ supabase, userId }) => {
          const now = new Date()
          const defaultFrom = new Date(now)
          defaultFrom.setDate(defaultFrom.getDate() - 60)
          const fromIso = (from ? new Date(from) : defaultFrom).toISOString()
          const toIso = (to ? new Date(to) : now).toISOString()

          let query = supabase
            .from('conversations')
            .select('id,started_at,ended_at,category,title,summary,message_count,conversation_photos(id)')
            .eq('user_id', userId)
            .gte('started_at', fromIso)
            .lte('started_at', toIso)
            .order('started_at', { ascending: false })
            .limit(limit ?? 50)
          if (category) query = query.eq('category', category)

          const { data, error } = await query
          if (error) return fail(`db_error: ${error.message}`)
          return ok({
            entries: (data ?? []).map((c) => ({
              id: c.id,
              startedAt: c.started_at,
              endedAt: c.ended_at,
              category: c.category,
              title: c.title,
              summary: c.summary,
              messageCount: c.message_count,
              photoCount: ((c as { conversation_photos?: unknown[] }).conversation_photos ?? []).length,
            })),
          })
        })
      },
    )

    server.tool(
      'list_personas',
      'Zwraca katalog doradców AI (person) dostępnych w aplikacji wraz z informacją które z nich zalogowany user już posiada i która jest obecnie aktywna. Pole `system_prompt` nie jest zwracane — to chroniona własność intelektualna płatnych person.',
      {},
      async (_args, extra) => {
        return withAuthCtx(extra.authInfo?.token, async ({ supabase, userId }) => {
          const [personasRes, ownedRes, settingsRes] = await Promise.all([
            supabase
              .from('personas')
              .select('id,name,tagline,description,price_pln_grosze,is_free,sort_order')
              .eq('is_active', true)
              .order('sort_order', { ascending: true }),
            supabase.from('user_personas').select('persona_id').eq('user_id', userId),
            supabase
              .from('user_settings')
              .select('active_persona_id')
              .eq('user_id', userId)
              .maybeSingle(),
          ])
          if (personasRes.error) return fail(`db_error: ${personasRes.error.message}`)
          const owned = new Set((ownedRes.data ?? []).map((r) => r.persona_id))
          const active = settingsRes.data?.active_persona_id ?? 'subskrypcik'
          return ok({
            personas: (personasRes.data ?? []).map((p) => ({
              id: p.id,
              name: p.name,
              tagline: p.tagline,
              description: p.description,
              pricePLN: p.price_pln_grosze / 100,
              isFree: p.is_free,
              owned: owned.has(p.id),
              active: p.id === active,
            })),
            activePersonaId: active,
          })
        })
      },
    )

    server.tool(
      'get_active_persona',
      'Zwraca id aktywnej persony usera oraz krótkie metadane (nazwa, tagline). System prompt nie jest zwracany — chroniona własność intelektualna.',
      {},
      async (_args, extra) => {
        return withAuthCtx(extra.authInfo?.token, async ({ supabase, userId }) => {
          const { data: settings } = await supabase
            .from('user_settings')
            .select('active_persona_id')
            .eq('user_id', userId)
            .maybeSingle()
          const id = settings?.active_persona_id ?? 'subskrypcik'
          const { data: p, error } = await supabase
            .from('personas')
            .select('id,name,tagline')
            .eq('id', id)
            .maybeSingle()
          if (error) return fail(`db_error: ${error.message}`)
          return ok({ activePersona: p ?? { id, name: 'Subskrypcik', tagline: '' } })
        })
      },
    )

    server.tool(
      'change_active_persona',
      'Zmienia aktywnego doradcę AI zalogowanego usera. Wymaga aby user posiadał wybraną personę (free albo kupioną). Zwraca 403 jeśli brak entitlementu. Tool nie inicjuje zakupów — do zakupu user musi przejść przez UI (Stripe Payment Link).',
      {
        personaId: z
          .string()
          .min(1)
          .describe('id persony, np. "subskrypcik", "mecenas", "ziomek".'),
      },
      async ({ personaId }, extra) => {
        return withAuthCtx(extra.authInfo?.token, async ({ supabase, userId }) => {
          const { data: entitlement } = await supabase
            .from('user_personas')
            .select('persona_id')
            .eq('persona_id', personaId)
            .maybeSingle()
          if (!entitlement) {
            return fail(`not_owned: User nie ma odblokowanej persony "${personaId}".`)
          }
          const { error } = await supabase
            .from('user_settings')
            .upsert(
              {
                user_id: userId,
                active_persona_id: personaId,
                updated_at: new Date().toISOString(),
              },
              { onConflict: 'user_id' },
            )
          if (error) return fail(`db_error: ${error.message}`)
          return ok({ activePersonaId: personaId })
        })
      },
    )
  },
  {
    serverInfo: { name: 'ostatni-dzien', version: '0.1.0' },
  },
  {
    basePath: '/api',
    disableSse: true,
    maxDuration: 30,
    verboseLogs: false,
  },
)

const fetchHandler = withMcpAuth(
  baseHandler,
  async (_req, bearerToken) => {
    if (!bearerToken) return undefined
    const result = await authenticateToken(bearerToken)
    if (!result.ok) return undefined
    return {
      token: bearerToken,
      clientId: result.ctx.userId,
      scopes: [],
    }
  },
  { required: true },
)

/**
 * Vercel Node functions wołają handler ze stylem (req, res) z Node IncomingMessage.
 * mcp-handler oczekuje Web Fetch Request → Response. Konwertujemy w obie strony.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const host = req.headers.host ?? 'localhost'
  const protocol = (req.headers['x-forwarded-proto'] as string | undefined) ?? 'https'
  const url = `${protocol}://${host}${req.url ?? '/api/mcp'}`

  const headers = new Headers()
  for (const [k, v] of Object.entries(req.headers)) {
    if (Array.isArray(v)) v.forEach((vv) => headers.append(k, vv))
    else if (typeof v === 'string') headers.set(k, v)
  }

  const method = req.method ?? 'GET'
  // Body: Vercel parsuje JSON do req.body — serializujemy z powrotem dla Request.
  let body: BodyInit | undefined
  if (method !== 'GET' && method !== 'HEAD') {
    if (req.body == null) body = undefined
    else if (typeof req.body === 'string') body = req.body
    else if (Buffer.isBuffer(req.body)) body = req.body
    else body = JSON.stringify(req.body)
    if (body && !headers.has('content-type')) headers.set('content-type', 'application/json')
  }

  const request = new Request(url, { method, headers, body })
  const response = await fetchHandler(request)

  res.status(response.status)
  response.headers.forEach((value, key) => res.setHeader(key, value))
  const buf = Buffer.from(await response.arrayBuffer())
  res.end(buf)
}
