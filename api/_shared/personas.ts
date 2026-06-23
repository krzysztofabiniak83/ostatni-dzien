import type { SupabaseClient } from '@supabase/supabase-js'
import { SYSTEM_PROMPT as FALLBACK_PROMPT } from './prompt.js'

/**
 * Zwraca system prompt aktywnej persony dla zalogowanego usera.
 *
 * Bezpieczeństwo: kolumna `personas.system_prompt` ma odebrane uprawnienie
 * SELECT od ról klienckich (authenticated/anon) — żeby user nie mógł sobie
 * wyciągnąć płatnych promptów z konsoli przeglądarki przez supabase-js.
 *
 * Prompt dostajemy przez funkcję SECURITY DEFINER `get_active_persona_prompt()`,
 * która w środku weryfikuje entitlement aktywnej persony usera. Jeżeli user
 * nie ma entitlementu na swoją `active_persona_id` (albo nie ma `user_settings`),
 * funkcja zwraca pusty wynik — wpadamy w fallback do wbudowanego promptu
 * Subskrypcika.
 */
export async function getActiveSystemPrompt(
  supabase: SupabaseClient,
  _userId: string,
): Promise<{ personaId: string; prompt: string }> {
  const { data, error } = await supabase.rpc('get_active_persona_prompt')

  if (error || !data || data.length === 0) {
    return { personaId: 'subskrypcik', prompt: FALLBACK_PROMPT }
  }

  const row = data[0] as { persona_id: string; prompt: string }
  if (!row.prompt) {
    return { personaId: 'subskrypcik', prompt: FALLBACK_PROMPT }
  }

  return { personaId: row.persona_id, prompt: row.prompt }
}
