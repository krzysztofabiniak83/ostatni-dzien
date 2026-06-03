import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Resend } from 'resend'

/**
 * Endpoint Vercel serverless: wysyła wiadomość z MessageSheet (Tiptap) na
 * skonfigurowany adres. Resend wysyła z `onboarding@resend.dev` na free tier
 * (bez weryfikacji własnej domeny). Klucz API trzymany w env vars Vercel.
 *
 * Env vars:
 * - RESEND_API_KEY (wymagane) — z https://resend.com → API Keys
 * - FEEDBACK_TO_EMAIL (opcjonalne) — domyślnie krzysztofabiniak@gmail.com
 */

const TO_EMAIL = process.env.FEEDBACK_TO_EMAIL || 'krzysztofabiniak@gmail.com'

/** Surowe stripowanie HTML → plain text (fallback gdy frontend nie wysłał plaina). */
function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|li|blockquote|h[1-6])>/gi, '\n')
    .replace(/<li>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
const FROM_EMAIL = process.env.FEEDBACK_FROM_EMAIL || 'Ostatni Dzień <onboarding@resend.dev>'
const MAX_BODY_CHARS = 10_000

interface FeedbackPayload {
  subject?: string
  bodyPlain?: string
  bodyHtml?: string
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return res
      .status(500)
      .json({ error: 'RESEND_API_KEY nie jest skonfigurowany na serwerze. Dodaj env var w Vercel.' })
  }

  const payload = req.body as FeedbackPayload

  // Walidacja minimalna.
  const subject = (payload?.subject || 'Wiadomość – Ostatni Dzień').slice(0, 200)
  const bodyPlain = (payload?.bodyPlain || '').slice(0, MAX_BODY_CHARS).trim()
  const bodyHtml = (payload?.bodyHtml || '').slice(0, MAX_BODY_CHARS).trim()

  if (!bodyPlain && !bodyHtml) {
    return res.status(400).json({ error: 'Brak treści wiadomości.' })
  }

  try {
    const resend = new Resend(apiKey)
    // Resend wymaga przynajmniej jednego z: text / html / react / template.
    // Mamy zawsze plain (z htmlToPlainText) — używamy go jako fallback dla text.
    const text = bodyPlain || stripHtml(bodyHtml)
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [TO_EMAIL],
      subject,
      text,
      ...(bodyHtml ? { html: bodyHtml } : {}),
    })

    if (error) {
      // Logujemy szczegóły server-side, klientowi pokazujemy generyczne.
      console.error('Resend error:', error)
      return res.status(502).json({ error: 'Nie udało się wysłać wiadomości. Spróbuj ponownie.' })
    }

    return res.status(200).json({ ok: true, id: data?.id ?? null })
  } catch (err) {
    console.error('send-feedback fatal:', err)
    return res.status(500).json({ error: 'Wewnętrzny błąd serwera.' })
  }
}
