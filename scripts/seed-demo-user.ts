/**
 * scripts/seed-demo-user.ts
 *
 * Wypełnia konto demo (login button "Testuj aplikację") realistycznymi
 * danymi: subskrypcje + rozmowy z dzienniczka + zdjęcia w Storage.
 *
 * Idempotentne — przy ponownym uruchomieniu czyści stare dane demo
 * (subscriptions, conversations, photos + pliki w Storage) i wsadza świeże.
 *
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   OPENAI_API_KEY
 *
 * Uruchomienie: npx tsx scripts/seed-demo-user.ts
 */

import { createClient } from '@supabase/supabase-js'
import {
  EMBED_MODEL,
  buildEmbedInput,
  embedTexts,
  toPgVector,
} from '../api/_shared/embeddings.js'

const DEMO_USER_ID = '622e83fc-9626-4c64-b602-b8a0496e4c0d'
const BUCKET = 'journal-photos'

const url = process.env.SUPABASE_URL
const srk = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !srk) throw new Error('Brak SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')

const supa = createClient(url, srk, { auth: { persistSession: false } })

function daysAgoIso(d: number, hh = 20, mm = 30): string {
  const t = new Date(Date.now() - d * 86_400_000)
  t.setHours(hh, mm, 0, 0)
  return t.toISOString()
}

// amount_pln to grosze (29.99 zł = 2999)
const SUBS = [
  { name: 'Netflix Premium',  amount_pln: 6700,  days_until: 2,  type: 'renewal', status: 'active', category: 'media_vod',          urgency: 'critical', section: 'week'  },
  { name: 'Spotify Family',   amount_pln: 2999,  days_until: 6,  type: 'renewal', status: 'active', category: 'audio_podcasts',     urgency: 'normal',   section: 'week'  },
  { name: 'ChatGPT Plus',     amount_pln: 8000,  days_until: 9,  type: 'renewal', status: 'active', category: 'ai_tools',           urgency: 'normal',   section: 'week'  },
  { name: 'Canva Pro',        amount_pln: 4999,  days_until: 3,  type: 'trial',   status: 'active', category: 'design_creative',    urgency: 'critical', section: 'week'  },
  { name: 'iCloud+ 200GB',    amount_pln: 1399,  days_until: 23, type: 'renewal', status: 'active', category: 'productivity_cloud', urgency: 'normal',   section: 'month' },
  { name: 'Disney+',          amount_pln: 2899,  days_until: 18, type: 'renewal', status: 'active', category: 'media_vod',          urgency: 'normal',   section: 'month' },
]

interface SeedConv {
  daysAgo: number
  hh: number
  mm: number
  duration_min: number
  category: string
  title: string
  summary: string
  photoSeeds?: string[] // picsum seeds
}

const CONVS: SeedConv[] = [
  {
    daysAgo: 1,
    hh: 21,
    mm: 12,
    duration_min: 14,
    category: 'media_vod',
    title: 'Netflix — czy podwyżka się opłaca',
    summary: 'Rozmowa o nowym cenniku Netflixa (67 zł/mc). Subskrypcik zaproponował pauzę na miesiąc i porównanie z HBO Max — decyzja odłożona na koniec miesiąca.',
    photoSeeds: ['netflix-ui', 'streaming-tv'],
  },
  {
    daysAgo: 3,
    hh: 18,
    mm: 40,
    duration_min: 9,
    category: 'ai_tools',
    title: 'ChatGPT Plus vs Claude Pro',
    summary: 'Porównanie planów AI pod kątem pisania + kodu. Rekomendacja: przetestować Claude równolegle przez miesiąc zanim zrezygnuję z ChatGPT.',
    photoSeeds: ['ai-laptop'],
  },
  {
    daysAgo: 7,
    hh: 11,
    mm: 5,
    duration_min: 18,
    category: 'design_creative',
    title: 'Figma — przejście na plan roczny',
    summary: 'Sprawdziliśmy, czy plan roczny Figmy się opłaca. Przy obecnym tempie pracy zwrot po 8 miesiącach. Przypomnienie na koniec bieżącego cyklu miesięcznego.',
    photoSeeds: ['figma-design', 'design-deck'],
  },
  {
    daysAgo: 12,
    hh: 22,
    mm: 18,
    duration_min: 11,
    category: 'productivity_cloud',
    title: '1Password — rodzina czy solo',
    summary: 'Analiza planu rodzinnego dla 3 osób. Wniosek: oszczędność 12 zł/mc względem trzech kont solo. Zmiana zaplanowana na nowy okres rozliczeniowy.',
  },
  {
    daysAgo: 18,
    hh: 14,
    mm: 30,
    duration_min: 7,
    category: 'media_vod',
    title: 'Disney+ — trial kończy się za 4 dni',
    summary: 'Przypomnienie o końcu triala Disney+. Zdecydowałem o anulowaniu — Subskrypcik podał deep link do ustawień konta.',
    photoSeeds: ['disney-screen'],
  },
  {
    daysAgo: 25,
    hh: 19,
    mm: 50,
    duration_min: 22,
    category: 'audio_podcasts',
    title: 'Spotify vs Apple Music — przesiadka?',
    summary: 'Porównanie bibliotek i jakości audio dla dwóch ekosystemów. Ostatecznie zostaję na Spotify — Apple Music nie warto, jeśli słucham głównie na Androidzie.',
    photoSeeds: ['music-app', 'headphones'],
  },
]

async function cleanup() {
  console.log('🧹 sprzątam stare dane demo…')
  // 1. List & remove storage files
  const { data: paths } = await supa
    .from('conversation_photos')
    .select('storage_path')
    .eq('user_id', DEMO_USER_ID)
  if (paths && paths.length > 0) {
    const toRemove = paths.map((p) => p.storage_path)
    const { error } = await supa.storage.from(BUCKET).remove(toRemove)
    if (error) console.warn('storage remove warning:', error.message)
    console.log(`  ‣ usuniętych plików: ${toRemove.length}`)
  }
  // 2. DB rows (cascade po conversations -> photos)
  await supa.from('conversation_photos').delete().eq('user_id', DEMO_USER_ID)
  await supa.from('conversations').delete().eq('user_id', DEMO_USER_ID)
  await supa.from('subscriptions').delete().eq('user_id', DEMO_USER_ID)
}

async function seedSubs() {
  console.log('💳 seeduję subskrypcje…')
  const today = new Date().toISOString().slice(0, 10)
  const rows = SUBS.map((s, i) => ({
    ...s,
    id: `demo-${Date.now()}-${i}`,
    user_id: DEMO_USER_ID,
    date: today,
    period: 'miesięcznie',
    period_short: 'miesięcznie',
  }))
  const { error } = await supa.from('subscriptions').insert(rows)
  if (error) throw error
  console.log(`  ‣ ${rows.length} subskrypcji`)
}

async function seedConvs() {
  console.log('💬 seeduję rozmowy + embeddingi…')
  const convRows = CONVS.map((c) => {
    const startedAt = daysAgoIso(c.daysAgo, c.hh, c.mm)
    const endedAt = new Date(new Date(startedAt).getTime() + c.duration_min * 60_000).toISOString()
    return {
      user_id: DEMO_USER_ID,
      started_at: startedAt,
      ended_at: endedAt,
      category: c.category,
      title: c.title,
      summary: c.summary,
      message_count: 6 + Math.floor(Math.random() * 10),
      raw_messages: [],
    }
  })
  const { data: inserted, error } = await supa
    .from('conversations')
    .insert(convRows)
    .select('id,category,title,summary')
  if (error) throw error
  if (!inserted) throw new Error('insert returned no data')

  // Embeddings
  const inputs = inserted.map((c) =>
    buildEmbedInput({ title: c.title, summary: c.summary, category: c.category, raw_messages: [] }),
  )
  const vectors = await embedTexts(inputs)
  for (let i = 0; i < inserted.length; i++) {
    await supa
      .from('conversations')
      .update({ embed_input: inputs[i], embed_model: EMBED_MODEL, embedding: toPgVector(vectors[i]) })
      .eq('id', inserted[i].id)
  }
  console.log(`  ‣ ${inserted.length} rozmów + ${vectors.length} embeddingów`)

  return inserted as Array<{ id: string }>
}

async function seedPhotos(conversations: Array<{ id: string }>) {
  console.log('🖼️  seeduję zdjęcia…')
  let total = 0
  for (let i = 0; i < CONVS.length; i++) {
    const photoSeeds = CONVS[i].photoSeeds ?? []
    if (photoSeeds.length === 0) continue
    const convId = conversations[i].id
    for (let pos = 0; pos < photoSeeds.length; pos++) {
      const seed = photoSeeds[pos]
      const photoId = crypto.randomUUID()
      const path = `${DEMO_USER_ID}/${convId}/${photoId}.jpg`
      const picsumUrl = `https://picsum.photos/seed/${seed}/1200/900`
      const res = await fetch(picsumUrl)
      if (!res.ok) {
        console.warn(`  ⚠ picsum fail ${seed}: ${res.status}`)
        continue
      }
      const buf = Buffer.from(await res.arrayBuffer())
      const up = await supa.storage.from(BUCKET).upload(path, buf, {
        contentType: 'image/jpeg',
        upsert: false,
      })
      if (up.error) {
        console.warn(`  ⚠ upload fail ${seed}: ${up.error.message}`)
        continue
      }
      await supa.from('conversation_photos').insert({
        conversation_id: convId,
        user_id: DEMO_USER_ID,
        storage_path: path,
        mime_type: 'image/jpeg',
        size_bytes: buf.length,
        width: 1200,
        height: 900,
        position: pos,
        original_name: `${seed}.jpg`,
      })
      total++
    }
  }
  console.log(`  ‣ ${total} zdjęć`)
}

async function main() {
  await cleanup()
  await seedSubs()
  const convs = await seedConvs()
  await seedPhotos(convs)
  console.log('✅ demo user wypełniony')
}

main().catch((err) => {
  console.error('❌', err)
  process.exit(1)
})
