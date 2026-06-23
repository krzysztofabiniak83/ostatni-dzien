/**
 * scripts/clone-to-demo-user.ts
 *
 * Klonuje WSZYSTKIE dane z konta źródłowego (Twoje główne) do konta demo
 * używanego przez button "Testuj aplikację". Stare dane demo czyści.
 *
 * Kopiuje:
 *   - public.subscriptions
 *   - public.conversations (z embeddingami — kopia 1:1, embedding jest niezależny od user_id)
 *   - public.conversation_photos + pliki w Storage (copy w bucketcie pod nową ścieżką)
 *
 * Idempotentne. Bezpieczne — nie rusza danych źródła.
 */

import { createClient } from '@supabase/supabase-js'

const SOURCE_USER_ID = '5ede959c-8380-4a7b-8b1f-a555f380aa64' // krzysztofabiniak@gmail.com
const DEMO_USER_ID = '622e83fc-9626-4c64-b602-b8a0496e4c0d'   // demo@ostatni-dzien.app
const BUCKET = 'journal-photos'

const url = process.env.SUPABASE_URL
const srk = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !srk) throw new Error('Brak SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')

const supa = createClient(url, srk, { auth: { persistSession: false } })

async function cleanup() {
  console.log('🧹 sprzątam dane demo…')
  const { data: paths } = await supa
    .from('conversation_photos')
    .select('storage_path')
    .eq('user_id', DEMO_USER_ID)
  if (paths && paths.length > 0) {
    await supa.storage.from(BUCKET).remove(paths.map((p) => p.storage_path))
    console.log(`  ‣ usuniętych plików: ${paths.length}`)
  }
  await supa.from('conversation_photos').delete().eq('user_id', DEMO_USER_ID)
  await supa.from('conversations').delete().eq('user_id', DEMO_USER_ID)
  await supa.from('subscriptions').delete().eq('user_id', DEMO_USER_ID)
}

async function cloneSubs() {
  console.log('💳 kopiuję subskrypcje…')
  const { data: src, error } = await supa
    .from('subscriptions')
    .select('*')
    .eq('user_id', SOURCE_USER_ID)
  if (error) throw error
  if (!src || src.length === 0) {
    console.log('  ‣ brak subskrypcji u źródła')
    return
  }
  const now = new Date().toISOString()
  const rows = src.map((s, i) => ({
    ...s,
    id: `demo-sub-${Date.now()}-${i}`,
    user_id: DEMO_USER_ID,
    created_at: now,
    updated_at: now,
  }))
  const { error: insErr } = await supa.from('subscriptions').insert(rows)
  if (insErr) throw insErr
  console.log(`  ‣ skopiowano: ${rows.length}`)
}

async function cloneConvsAndPhotos() {
  console.log('💬 kopiuję rozmowy…')
  const { data: srcConvs, error } = await supa
    .from('conversations')
    .select('id,started_at,ended_at,category,title,summary,message_count,raw_messages,embedding,embed_input,embed_model')
    .eq('user_id', SOURCE_USER_ID)
  if (error) throw error
  if (!srcConvs || srcConvs.length === 0) {
    console.log('  ‣ brak rozmów u źródła')
    return
  }

  // mapowanie oldId -> newId
  const idMap = new Map<string, string>()
  const batchSize = 50
  for (let i = 0; i < srcConvs.length; i += batchSize) {
    const batch = srcConvs.slice(i, i + batchSize)
    const newRows = batch.map((c) => ({
      user_id: DEMO_USER_ID,
      started_at: c.started_at,
      ended_at: c.ended_at,
      category: c.category,
      title: c.title,
      summary: c.summary,
      message_count: c.message_count,
      raw_messages: c.raw_messages,
      embedding: c.embedding,
      embed_input: c.embed_input,
      embed_model: c.embed_model,
    }))
    const { data: inserted, error: insErr } = await supa.from('conversations').insert(newRows).select('id')
    if (insErr) throw insErr
    inserted?.forEach((newRow, idx) => idMap.set(batch[idx].id, newRow.id))
  }
  console.log(`  ‣ skopiowano: ${srcConvs.length} rozmów`)

  console.log('🖼️  kopiuję zdjęcia (DB + Storage)…')
  const { data: srcPhotos, error: pErr } = await supa
    .from('conversation_photos')
    .select('conversation_id,storage_path,mime_type,size_bytes,width,height,position,original_name')
    .eq('user_id', SOURCE_USER_ID)
  if (pErr) throw pErr
  if (!srcPhotos || srcPhotos.length === 0) {
    console.log('  ‣ brak zdjęć u źródła')
    return
  }

  let photoTotal = 0
  for (const p of srcPhotos) {
    const newConvId = idMap.get(p.conversation_id)
    if (!newConvId) continue
    const photoId = crypto.randomUUID()
    const ext = p.storage_path.split('.').pop() || 'jpg'
    const newPath = `${DEMO_USER_ID}/${newConvId}/${photoId}.${ext}`

    // copy file in bucket
    const copy = await supa.storage.from(BUCKET).copy(p.storage_path, newPath)
    if (copy.error) {
      console.warn(`  ⚠ copy fail ${p.storage_path}: ${copy.error.message}`)
      continue
    }
    const { error: insErr } = await supa.from('conversation_photos').insert({
      conversation_id: newConvId,
      user_id: DEMO_USER_ID,
      storage_path: newPath,
      mime_type: p.mime_type,
      size_bytes: p.size_bytes,
      width: p.width,
      height: p.height,
      position: p.position,
      original_name: p.original_name,
    })
    if (insErr) {
      console.warn(`  ⚠ insert fail: ${insErr.message}`)
      // try cleanup the orphan file
      await supa.storage.from(BUCKET).remove([newPath])
      continue
    }
    photoTotal++
  }
  console.log(`  ‣ skopiowano: ${photoTotal} zdjęć`)
}

async function main() {
  await cleanup()
  await cloneSubs()
  await cloneConvsAndPhotos()
  console.log('✅ demo zsynchronizowane z głównym kontem')
}

main().catch((err) => {
  console.error('❌', err)
  process.exit(1)
})
