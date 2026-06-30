import type { SupabaseClient } from '@supabase/supabase-js'

export const DAILY_MESSAGE_LIMIT = 20

// Per-minutowy soft limit AI requestów per user. Domyślnie 10/min;
// nadpisywalne env-em `AI_PER_MINUTE_LIMIT`.
export const PER_MINUTE_LIMIT = Number(process.env.AI_PER_MINUTE_LIMIT ?? '10')
const WINDOW_MS = 60_000

// Sliding window w pamięci procesu (Vercel function instance).
// Świadomy trade-off: nie jest globalny pomiędzy instancjami, ale
// wystarczająco bramkuje burst per user bez round-tripa do DB.
const hits = new Map<string, number[]>()

export type MinuteRateResult =
  | { ok: true; remaining: number; resetMs: number }
  | { ok: false; remaining: 0; resetMs: number }

/**
 * Sprawdza i odnotowuje zapytanie usera w 60-sekundowym oknie.
 * Wywołuj PRZED wysłaniem zapytania do AI/LLM.
 */
export function checkPerMinuteRate(userId: string, limit = PER_MINUTE_LIMIT): MinuteRateResult {
  const now = Date.now()
  const cutoff = now - WINDOW_MS
  const arr = (hits.get(userId) ?? []).filter((t) => t > cutoff)

  if (arr.length >= limit) {
    const resetMs = Math.max(0, arr[0] + WINDOW_MS - now)
    hits.set(userId, arr)
    return { ok: false, remaining: 0, resetMs }
  }

  arr.push(now)
  hits.set(userId, arr)
  return { ok: true, remaining: limit - arr.length, resetMs: WINDOW_MS }
}

export type RateLimitResult =
  | { ok: true; used: number }
  | { ok: false; used: number }

/**
 * Wspólny licznik dziennych wiadomości AI (chat_daily_usage).
 * Sprawdza limit, a gdy mieści się — inkrementuje (upsert na user_id+date).
 * Nie pisze do response — caller decyduje co zwrócić.
 */
export async function checkAndIncrementDailyUsage(
  supabase: SupabaseClient,
  userId: string,
): Promise<RateLimitResult> {
  const today = new Date().toISOString().slice(0, 10)
  const { data: usageRow } = await supabase
    .from('chat_daily_usage')
    .select('message_count')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle()

  const used = usageRow?.message_count ?? 0
  if (used >= DAILY_MESSAGE_LIMIT) {
    return { ok: false, used }
  }

  await supabase.from('chat_daily_usage').upsert(
    { user_id: userId, date: today, message_count: used + 1 },
    { onConflict: 'user_id,date' },
  )

  return { ok: true, used: used + 1 }
}
