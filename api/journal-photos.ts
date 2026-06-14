import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getUserFromRequest } from './_shared/auth.js'

/**
 * Zdjęcia w dzienniczku rozmów.
 *
 * POST   /api/journal-photos
 *   Body: { conversationId, storagePath, mimeType, sizeBytes, originalName?, width?, height? }
 *   Insert do conversation_photos (RLS pilnuje że conversation należy do usera).
 *   Auto-przypisuje position = max(position)+1.
 *
 * DELETE /api/journal-photos?id=<photoId>
 *   Kasuje rekord + plik ze Storage. RLS = select/delete tylko własnych.
 */

const BUCKET = 'journal-photos'
const MAX_PHOTOS_PER_ENTRY = 6
const MAX_SIZE_BYTES = 10 * 1024 * 1024
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])

interface CreateBody {
  conversationId: string
  storagePath: string
  mimeType: string
  sizeBytes: number
  originalName?: string
  width?: number
  height?: number
}

async function handlePost(req: VercelRequest, res: VercelResponse) {
  const ctx = await getUserFromRequest(req, res)
  if (!ctx) return
  const { supabase, userId } = ctx

  const body = req.body as Partial<CreateBody>
  const conversationId = body.conversationId
  const storagePath = body.storagePath
  const mimeType = body.mimeType
  const sizeBytes = body.sizeBytes

  if (!conversationId || !storagePath || !mimeType || typeof sizeBytes !== 'number') {
    res.status(400).json({ error: 'bad_request', message: 'Brak wymaganych pól.' })
    return
  }
  if (!ALLOWED_MIME.has(mimeType)) {
    res.status(400).json({ error: 'bad_mime', message: 'Nieobsługiwany typ pliku.' })
    return
  }
  if (sizeBytes <= 0 || sizeBytes > MAX_SIZE_BYTES) {
    res.status(400).json({ error: 'bad_size', message: 'Plik za duży (max 10 MB).' })
    return
  }
  // Pierwszy segment ścieżki musi być user_id (zgodnie z RLS Storage).
  if (!storagePath.startsWith(`${userId}/`)) {
    res.status(403).json({ error: 'bad_path', message: 'Ścieżka pliku poza Twoim folderem.' })
    return
  }

  // Limit liczby zdjęć na wpis.
  const { count, error: countErr } = await supabase
    .from('conversation_photos')
    .select('id', { count: 'exact', head: true })
    .eq('conversation_id', conversationId)
  if (countErr) {
    res.status(500).json({ error: 'db_error', message: countErr.message })
    return
  }
  if ((count ?? 0) >= MAX_PHOTOS_PER_ENTRY) {
    res.status(409).json({ error: 'limit_reached', message: `Max ${MAX_PHOTOS_PER_ENTRY} zdjęć na wpis.` })
    return
  }

  const position = count ?? 0

  const { data, error } = await supabase
    .from('conversation_photos')
    .insert({
      conversation_id: conversationId,
      user_id: userId,
      storage_path: storagePath,
      mime_type: mimeType,
      size_bytes: sizeBytes,
      width: body.width ?? null,
      height: body.height ?? null,
      original_name: body.originalName ?? null,
      position,
    })
    .select('id,conversation_id,storage_path,mime_type,size_bytes,width,height,position,created_at')
    .single()

  if (error) {
    res.status(500).json({ error: 'db_error', message: error.message })
    return
  }

  const signed = await supabase.storage.from(BUCKET).createSignedUrl(data.storage_path, 3600)
  res.status(200).json({
    photo: {
      id: data.id,
      conversationId: data.conversation_id,
      storagePath: data.storage_path,
      mimeType: data.mime_type,
      sizeBytes: data.size_bytes,
      width: data.width,
      height: data.height,
      position: data.position,
      createdAt: data.created_at,
      signedUrl: signed.data?.signedUrl ?? null,
    },
  })
}

async function handleDelete(req: VercelRequest, res: VercelResponse) {
  const ctx = await getUserFromRequest(req, res)
  if (!ctx) return
  const { supabase } = ctx

  const url = new URL(req.url || '', 'http://x')
  const id = url.searchParams.get('id')
  if (!id) {
    res.status(400).json({ error: 'bad_request', message: 'Brak id.' })
    return
  }

  // RLS gwarantuje że dostaniemy tylko swoje.
  const { data: photo, error: selErr } = await supabase
    .from('conversation_photos')
    .select('id,storage_path')
    .eq('id', id)
    .maybeSingle()
  if (selErr) {
    res.status(500).json({ error: 'db_error', message: selErr.message })
    return
  }
  if (!photo) {
    res.status(404).json({ error: 'not_found' })
    return
  }

  const { error: storageErr } = await supabase.storage.from(BUCKET).remove([photo.storage_path])
  if (storageErr) {
    res.status(500).json({ error: 'storage_error', message: storageErr.message })
    return
  }

  const { error: delErr } = await supabase.from('conversation_photos').delete().eq('id', id)
  if (delErr) {
    // Plik już zniknął, rekord został — log warn, ale zwracamy 200 (UI i tak go usunie).
    console.warn('[journal-photos] db delete failed after storage remove:', delErr.message)
  }

  res.status(200).json({ ok: true })
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') return handlePost(req, res)
  if (req.method === 'DELETE') return handleDelete(req, res)
  res.status(405).json({ error: 'method_not_allowed' })
}
