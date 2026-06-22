import type { SupabaseClient } from '@supabase/supabase-js'
import { SYSTEM_PROMPT as FALLBACK_PROMPT } from './prompt.js'

/**
 * Zwraca system prompt aktywnej persony dla zalogowanego usera.
 *
 * Reguły:
 * 1. Czytamy `user_settings.active_persona_id`. Brak rekordu → fallback 'subskrypcik'.
 * 2. Weryfikujemy entitlement (`user_personas`) — jeżeli user nie ma aktywnej persony
 *    w posiadaniu (np. ktoś ukradkiem zmienił ID), wracamy do 'subskrypcik'.
 * 3. SELECT `personas.system_prompt`. Jeżeli czegokolwiek brakuje → wbudowany
 *    `FALLBACK_PROMPT` (Subskrypcik z kodu) — czat nie może się rozjechać przez DB.
 *
 * Cały przepływ idzie przez klienta z Bearer userem (RLS respektowane).
 */
export async function getActiveSystemPrompt(
  supabase: SupabaseClient,
  userId: string,
): Promise<{ personaId: string; prompt: string }> {
  const { data: settings } = await supabase
    .from('user_settings')
    .select('active_persona_id')
    .eq('user_id', userId)
    .maybeSingle()

  const requestedId = settings?.active_persona_id ?? 'subskrypcik'

  // Weryfikacja entitlementu — RLS sam wymusi że user widzi tylko swoje wiersze.
  const { data: entitlement } = await supabase
    .from('user_personas')
    .select('persona_id')
    .eq('persona_id', requestedId)
    .maybeSingle()

  const personaId = entitlement ? requestedId : 'subskrypcik'

  const { data: persona } = await supabase
    .from('personas')
    .select('system_prompt')
    .eq('id', personaId)
    .maybeSingle()

  if (!persona?.system_prompt) {
    return { personaId: 'subskrypcik', prompt: FALLBACK_PROMPT }
  }

  return { personaId, prompt: persona.system_prompt }
}
