import type { SupabaseClient } from '@supabase/supabase-js'

export const DAILY_MESSAGE_LIMIT = 20

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
