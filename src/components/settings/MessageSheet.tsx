import { useState } from 'react'
import { AnimatePresence, motion, type PanInfo } from 'framer-motion'
import { Check, Send } from 'lucide-react'
import { htmlToPlainText, RichTextEditor } from '../editor/RichTextEditor'

interface MessageSheetProps {
  open: boolean
  onClose: () => void
  subject: string
  /** Adres odbiorcy — FormSubmit forwarduje wiadomość prosto tam. */
  to: string
  /** Fallback mailto (gdy backend padnie). */
  fallbackTo?: string
  onSent?: () => void
}

const MAX_CHARS = 2000

type Status = 'idle' | 'sending' | 'sent' | 'pending-activation' | 'error'

const FORMSUBMIT_ACTIVATED_KEY = 'ostatni-dzien-msg-activated'

/**
 * Bottom sheet z edytorem Tiptap → POST /api/send-feedback (Resend) →
 * email leci prosto na skrzynkę odbiorcy. Bez otwierania klienta poczty.
 * Fallback: jeśli backend padnie, oferujemy „spróbuj mailem" z pre-fillem.
 */
export function MessageSheet({ open, onClose, subject, to, fallbackTo, onSent }: MessageSheetProps) {
  const [html, setHtml] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const reset = () => {
    setHtml('')
    setStatus('idle')
    setErrorMsg(null)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 80) handleClose()
  }

  const isEmpty = !html || html === '<p></p>'

  const handleSend = async () => {
    if (isEmpty || status === 'sending') return
    setStatus('sending')
    setErrorMsg(null)

    const bodyPlain = htmlToPlainText(html)
    const activated = (() => {
      try {
        return localStorage.getItem(FORMSUBMIT_ACTIVATED_KEY) === '1'
      } catch {
        return false
      }
    })()

    try {
      // FormSubmit.co — zero-config email forwarding. Pierwszy POST wysyła
      // link aktywacyjny na odbiorcę; każdy następny leci wprost.
      const res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(to)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          _subject: subject,
          _template: 'table',
          _captcha: 'false',
          message: bodyPlain,
        }),
      })

      const data = (await res.json().catch(() => ({}))) as {
        success?: string | boolean
        message?: string
      }

      const success = data.success === true || data.success === 'true'
      if (!res.ok || !success) {
        throw new Error(data.message || `Błąd ${res.status}`)
      }

      // Pierwsza wysyłka u tego usera — pokaż info o linku aktywacyjnym.
      if (!activated) {
        try {
          localStorage.setItem(FORMSUBMIT_ACTIVATED_KEY, '1')
        } catch {
          // ignore
        }
        setStatus('pending-activation')
      } else {
        setStatus('sent')
      }
      onSent?.()
      window.setTimeout(() => {
        reset()
        onClose()
      }, 2400)
    } catch (err) {
      setStatus('error')
      setErrorMsg(err instanceof Error ? err.message : 'Nie udało się wysłać.')
    }
  }

  const tryMailtoFallback = () => {
    if (!fallbackTo) return
    const plain = htmlToPlainText(html)
    const url = `mailto:${fallbackTo}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(plain)}`
    window.location.href = url
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="absolute inset-0 z-[400] flex items-end"
          style={{ background: 'rgba(13,31,26,0.4)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={handleClose}
        >
          <motion.div
            className="flex max-h-[88%] w-full flex-col rounded-t-[28px] bg-bg-base shadow-[0_-20px_40px_-10px_rgba(13,31,26,0.2)]"
            initial={{ y: '110%' }}
            animate={{ y: 0 }}
            exit={{ y: '110%' }}
            transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
            drag={status === 'sent' || status === 'pending-activation' ? false : 'y'}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={handleDragEnd}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-shrink-0 cursor-grab px-5 pt-3 active:cursor-grabbing">
              <div className="mx-auto mb-3 h-1 w-10 rounded-pill bg-hairline" />
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-serif text-[24px] tracking-[-0.02em]">Napisz do nas</h2>
                <button
                  aria-label="Zamknij"
                  onClick={handleClose}
                  className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-hairline bg-bg-card text-ink-secondary transition-all hover:border-ink-tertiary hover:text-ink-primary active:scale-[0.94]"
                >
                  <svg className="h-[16px] w-[16px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {status !== 'sent' && status !== 'pending-activation' && (
                <div className="mb-3 text-[12px] leading-relaxed text-ink-secondary">
                  Co Ci się spodobało, co przeszkadza, co byś dodał? Wiadomość pójdzie prosto na naszą skrzynkę
                  — bez otwierania klienta poczty.
                </div>
              )}
            </div>

            {status === 'sent' || status === 'pending-activation' ? (
              <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-bg-base">
                  <Check className="h-6 w-6" strokeWidth={2.4} />
                </div>
                <div className="font-serif text-[22px] tracking-[-0.01em]">
                  {status === 'pending-activation' ? 'Prawie gotowe' : 'Wysłano'}
                </div>
                <div className="mt-1 max-w-[300px] text-[13px] leading-relaxed text-ink-secondary">
                  {status === 'pending-activation'
                    ? 'Sprawdź skrzynkę — wysłaliśmy jednorazowy link aktywujący. Po kliknięciu kolejne wiadomości będą trafiać prosto na e-mail.'
                    : 'Dzięki! Odezwiemy się jak tylko damy radę.'}
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto px-5 pb-2">
                  <RichTextEditor
                    value={html}
                    onChange={setHtml}
                    placeholder="Cześć, chciałem podzielić się…"
                    maxLength={MAX_CHARS}
                    autoFocus
                  />

                  {status === 'error' && errorMsg && (
                    <div className="mt-3 rounded-md border border-alert/30 bg-alert-soft/60 px-4 py-3 text-[12px] leading-relaxed text-alert">
                      <div className="mb-1 font-medium">Nie udało się wysłać</div>
                      <div className="text-ink-secondary">{errorMsg}</div>
                      {fallbackTo && (
                        <button
                          type="button"
                          onClick={tryMailtoFallback}
                          className="mt-2 underline underline-offset-2 hover:text-ink-primary"
                        >
                          Spróbuj wysłać mailem
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex-shrink-0 px-5 pb-8 pt-3">
                  <button
                    onClick={handleSend}
                    disabled={isEmpty || status === 'sending'}
                    className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-accent px-5 py-[17px] text-[15px] font-medium text-bg-base transition-all hover:bg-accent-hover active:scale-[0.98] disabled:opacity-40 disabled:hover:bg-accent"
                  >
                    {status === 'sending' ? (
                      <>
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-bg-base/30 border-t-bg-base" />
                        Wysyłanie…
                      </>
                    ) : (
                      <>
                        <Send className="h-[16px] w-[16px]" strokeWidth={1.8} />
                        Wyślij wiadomość
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
