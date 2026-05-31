import type { ComponentType } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

export type Source = 'screenshot' | 'email' | 'manual'

interface SourceSheetProps {
  open: boolean
  onPick: (source: Source) => void
  onCancel: () => void
}

function ScreenshotIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.7}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  )
}
function MailIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.7}>
      <path d="M4 4h16c1 0 2 1 2 2v12c0 1-1 2-2 2H4c-1 0-2-1-2-2V6c0-1 1-2 2-2z" />
      <path d="M22 6l-10 7L2 6" />
    </svg>
  )
}
function PenIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.7}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

const OPTIONS: { source: Source; title: string; desc: string; icon: ComponentType; primary?: boolean }[] = [
  {
    source: 'screenshot',
    title: 'Wrzuć screenshot',
    desc: 'Najszybszy sposób — odczytamy dane z obrazu',
    icon: ScreenshotIcon,
    primary: true,
  },
  {
    source: 'email',
    title: 'Prześlij potwierdzenie z maila',
    desc: "Forward'uj e-mail od dostawcy",
    icon: MailIcon,
  },
  {
    source: 'manual',
    title: 'Dodaj ręcznie',
    desc: 'Wpisz dane samodzielnie',
    icon: PenIcon,
  },
]

/** Bottom sheet wyboru źródła dodawania. Slajduje od dołu, backdrop z blur. */
export function SourceSheet({ open, onPick, onCancel }: SourceSheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="absolute inset-0 z-[300] flex items-end"
          style={{ background: 'rgba(13,31,26,0.4)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onCancel}
        >
          <motion.div
            className="w-full rounded-t-[28px] bg-bg-base px-5 pb-8 pt-3 shadow-[0_-20px_40px_-10px_rgba(13,31,26,0.2)]"
            initial={{ y: '110%' }}
            animate={{ y: 0 }}
            exit={{ y: '110%' }}
            transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-pill bg-hairline" />
            <div className="mb-[6px] text-center font-serif text-[24px] tracking-[-0.02em]">
              Dodaj <em className="italic text-accent">subskrypcję</em>
            </div>
            <div className="mb-[22px] text-center text-[13px] text-ink-secondary">
              Wybierz źródło — resztę zrobimy za Ciebie
            </div>

            <div className="flex flex-col gap-2">
              {OPTIONS.map((opt) => {
                const Icon = opt.icon
                return (
                  <button
                    key={opt.source}
                    onClick={() => onPick(opt.source)}
                    className={
                      opt.primary
                        ? 'flex w-full items-center gap-[14px] rounded-lg border border-accent bg-accent p-[16px] px-[18px] text-left text-bg-base transition-all hover:bg-accent-hover active:scale-[0.98]'
                        : 'flex w-full items-center gap-[14px] rounded-lg border border-hairline bg-bg-card p-[16px] px-[18px] text-left text-ink-primary transition-all hover:border-ink-tertiary active:scale-[0.98]'
                    }
                  >
                    <div
                      className={
                        opt.primary
                          ? 'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-white/15 text-bg-base'
                          : 'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent'
                      }
                    >
                      <Icon />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-[2px] text-[15px] font-medium tracking-[-0.005em]">{opt.title}</div>
                      <div className="text-[12px] opacity-70">{opt.desc}</div>
                    </div>
                  </button>
                )
              })}
            </div>

            <button
              onClick={onCancel}
              className="mt-2 w-full p-4 text-[14px] text-ink-secondary transition-colors hover:text-ink-primary"
            >
              Anuluj
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
