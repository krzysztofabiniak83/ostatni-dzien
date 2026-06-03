import { useState } from 'react'
import { AnimatePresence, motion, type PanInfo } from 'framer-motion'
import { Send } from 'lucide-react'
import { htmlToPlainText, RichTextEditor } from '../editor/RichTextEditor'

interface MessageSheetProps {
  open: boolean
  onClose: () => void
  /** Adres docelowy + temat — używamy mailto jako transport (MVP, bez backendu). */
  to: string
  subject: string
  /** Callback po wysłaniu (np. toast). */
  onSent?: (plainBody: string) => void
}

const MAX_CHARS = 2000

/**
 * Bottom sheet z edytorem Tiptap do wysłania wiadomości in-app.
 * Demo use case dla RichTextEditor — pokazuje wzór "napisz w aplikacji →
 * jedno kliknięcie → systemowy klient poczty z gotowym body".
 *
 * W produkcji body można wysłać POST-em na backend zamiast mailto.
 */
export function MessageSheet({ open, onClose, to, subject, onSent }: MessageSheetProps) {
  const [html, setHtml] = useState('')

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 80) onClose()
  }

  const isEmpty = !html || html === '<p></p>'

  const handleSend = () => {
    if (isEmpty) return
    const plain = htmlToPlainText(html)
    const mailtoUrl = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(plain)}`
    // Wywołanie systemowego handlera mailto — bez nowej karty.
    window.location.href = mailtoUrl
    onSent?.(plain)
    setHtml('')
    onClose()
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
          onClick={onClose}
        >
          <motion.div
            className="flex max-h-[88%] w-full flex-col rounded-t-[28px] bg-bg-base shadow-[0_-20px_40px_-10px_rgba(13,31,26,0.2)]"
            initial={{ y: '110%' }}
            animate={{ y: 0 }}
            exit={{ y: '110%' }}
            transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
            drag="y"
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
                  onClick={onClose}
                  className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-hairline bg-bg-card text-ink-secondary transition-all hover:border-ink-tertiary hover:text-ink-primary active:scale-[0.94]"
                >
                  <svg className="h-[16px] w-[16px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="mb-3 text-[12px] leading-relaxed text-ink-secondary">
                Co Ci się spodobało, co przeszkadza, co byś dodał? Treść trafi do nas mailem — możesz formatować
                tekst, dodać listę kroków lub cytat.
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 pb-2">
              <RichTextEditor
                value={html}
                onChange={setHtml}
                placeholder="Cześć, chciałem podzielić się…"
                maxLength={MAX_CHARS}
                autoFocus
              />
            </div>

            <div className="flex-shrink-0 px-5 pb-8 pt-3">
              <button
                onClick={handleSend}
                disabled={isEmpty}
                className="flex w-full items-center justify-center gap-2 rounded-[14px] bg-accent px-5 py-[17px] text-[15px] font-medium text-bg-base transition-all hover:bg-accent-hover active:scale-[0.98] disabled:opacity-40 disabled:hover:bg-accent"
              >
                <Send className="h-[16px] w-[16px]" strokeWidth={1.8} />
                Wyślij wiadomość
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
