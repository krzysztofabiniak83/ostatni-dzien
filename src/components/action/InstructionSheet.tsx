import { AnimatePresence, motion } from 'framer-motion'

interface InstructionSheetProps {
  open: boolean
  serviceName: string
  onClose: () => void
}

/** Kroki anulowania — mock instrukcji (Faza 2). W produkcji per-usługa. */
function steps(service: string): string[] {
  const short = service.split(' ')[0]
  return [
    `Otwórz ustawienia konta w ${short} (przeglądarka lub aplikacja).`,
    'Przejdź do sekcji „Subskrypcje" lub „Płatności".',
    `Wybierz ${service} i kliknij „Anuluj subskrypcję".`,
    'Potwierdź anulowanie — powinieneś dostać e-mail z potwierdzeniem.',
  ]
}

/** Bottom sheet z numerowaną instrukcją. Slajduje od dołu. */
export function InstructionSheet({ open, serviceName, onClose }: InstructionSheetProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="absolute inset-0 z-[450] flex items-end"
          style={{ background: 'rgba(13,31,26,0.4)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onClose}
        >
          <motion.div
            className="w-full rounded-t-xl bg-bg-base px-6 pb-8 pt-6"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-5 h-1 w-10 rounded-pill bg-hairline" />
            <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">
              Jak anulować
            </div>
            <div className="mb-5 font-serif text-[22px] tracking-[-0.01em]">{serviceName}</div>

            <ol className="flex flex-col gap-3">
              {steps(serviceName).map((step, i) => (
                <li key={i} className="flex gap-3">
                  <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-accent-soft font-mono text-[11px] font-medium text-accent">
                    {i + 1}
                  </span>
                  <span className="pt-[2px] text-[14px] leading-relaxed text-ink-primary">{step}</span>
                </li>
              ))}
            </ol>

            <button
              onClick={onClose}
              className="mt-6 w-full rounded-md border border-hairline px-5 py-[14px] text-[15px] font-medium text-ink-primary transition-colors hover:border-ink-secondary active:scale-[0.98]"
            >
              Rozumiem
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
