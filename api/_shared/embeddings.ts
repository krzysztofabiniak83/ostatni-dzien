import OpenAI from 'openai'

/**
 * Embeddingi do hybrydowego wyszukiwania w dzienniczku rozmów.
 *
 * Model: text-embedding-3-small (1536 wymiarów). 1 wpis = 1 wektor, bez chunkowania
 * — wpisy są krótkie (title + summary + fragmenty ≤ ~500 znaków).
 */

export const EMBED_MODEL = process.env.OPENAI_EMBED_MODEL || 'text-embedding-3-small'
export const EMBED_DIM = 1536

let cached: OpenAI | null = null
function client(): OpenAI {
  if (!cached) cached = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return cached
}

/** Liczy embedding dla pojedynczego tekstu (1 request). */
export async function embedQuery(text: string): Promise<number[]> {
  const trimmed = (text || '').trim().slice(0, 8000)
  if (!trimmed) return new Array(EMBED_DIM).fill(0)
  const res = await client().embeddings.create({ model: EMBED_MODEL, input: trimmed })
  return res.data[0].embedding
}

/** Batch embed dla seedu / re-embed. Dzieli na chunki po 96. */
export async function embedTexts(inputs: string[]): Promise<number[][]> {
  const BATCH = 96
  const out: number[][] = []
  for (let i = 0; i < inputs.length; i += BATCH) {
    const batch = inputs.slice(i, i + BATCH).map((s) => (s || '').slice(0, 8000))
    const res = await client().embeddings.create({ model: EMBED_MODEL, input: batch })
    for (const item of res.data) out.push(item.embedding)
  }
  return out
}

/** Format pgvector literal: '[0.1,0.2,...]' — używany w UPDATE/RPC. */
export function toPgVector(vec: number[]): string {
  return '[' + vec.join(',') + ']'
}

type ConversationLike = {
  title?: string | null
  summary?: string | null
  category?: string | null
  raw_messages?: Array<{ role?: string; content?: string }> | null
}

/**
 * Buduje wejście tekstowe do embeddingu — deterministycznie z tych samych pól
 * (przydatne przy re-embed po zmianie modelu).
 */
export function buildEmbedInput(c: ConversationLike): string {
  const messages = Array.isArray(c.raw_messages) ? c.raw_messages : []
  const firstUser = messages.find((m) => m?.role === 'user')?.content?.trim() || ''
  const lastAssistant = [...messages].reverse().find((m) => m?.role === 'assistant')?.content?.trim() || ''
  const parts = [
    c.title || '',
    `Kategoria: ${c.category || 'other'}`,
    c.summary || '',
    firstUser ? `Pytanie: ${firstUser}` : '',
    lastAssistant ? `Odpowiedź: ${lastAssistant}` : '',
  ].filter(Boolean)
  return parts.join('\n').slice(0, 4000)
}
