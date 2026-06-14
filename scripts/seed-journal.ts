/**
 * scripts/seed-journal.ts
 *
 * Re-embed wierszy w `public.conversations` którym brakuje embeddingu.
 * Używaj po seedzie SQL (199 wpisów już w bazie, embedding NULL).
 *
 * Wymaga:
 *   SUPABASE_URL                = https://ehfrpymyshwvhkbskvsf.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY   = <service_role JWT>  (bypass RLS)
 *   OPENAI_API_KEY              = sk-...
 *
 * Uruchomienie:
 *   npx tsx scripts/seed-journal.ts [--user <uuid>] [--limit N] [--dry-run]
 */

import { createClient } from '@supabase/supabase-js'
import {
  EMBED_MODEL,
  buildEmbedInput,
  embedTexts,
  toPgVector,
} from '../api/_shared/embeddings.js'

const args = process.argv.slice(2)
function arg(name: string): string | undefined {
  const i = args.indexOf(`--${name}`)
  return i >= 0 ? args[i + 1] : undefined
}
const dryRun = args.includes('--dry-run')
const userFilter = arg('user')
const limit = Number(arg('limit') || '500')

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Brak SUPABASE_URL lub SUPABASE_SERVICE_ROLE_KEY w env.')
  process.exit(1)
}
if (!process.env.OPENAI_API_KEY) {
  console.error('Brak OPENAI_API_KEY w env.')
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false } })

async function main() {
  let q = supabase
    .from('conversations')
    .select('id,title,summary,category,raw_messages')
    .is('embedding', null)
    .order('started_at', { ascending: true })
    .limit(limit)
  if (userFilter) q = q.eq('user_id', userFilter)

  const { data: rows, error } = await q
  if (error) throw error
  if (!rows || rows.length === 0) {
    console.log('Brak wierszy do uzupełnienia (embedding IS NULL).')
    return
  }

  console.log(`Do embedowania: ${rows.length} wierszy. Model: ${EMBED_MODEL}.`)
  const inputs = rows.map((r) => buildEmbedInput(r))
  if (dryRun) {
    console.log('--dry-run — przykład inputu:\n' + inputs[0])
    return
  }

  const vectors = await embedTexts(inputs)
  console.log(`Policzono ${vectors.length} wektorów. Aktualizacja DB...`)

  let updated = 0
  for (let i = 0; i < rows.length; i++) {
    const { error: upErr } = await supabase
      .from('conversations')
      .update({
        embed_input: inputs[i],
        embed_model: EMBED_MODEL,
        embedding: toPgVector(vectors[i]),
      })
      .eq('id', rows[i].id)
    if (upErr) {
      console.error(`Błąd update ${rows[i].id}:`, upErr.message)
    } else {
      updated++
    }
  }
  console.log(`Zaktualizowano ${updated}/${rows.length} wierszy.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
