import { AnimatePresence, motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface ConfirmDialogProps {
  open: boolean
  title: string
  body: ReactNode
  confirmLabel: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

/** Modal potwierdzenia (np. usunięcie z listy). Overlay z blur, scale-in. */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel = 'Anuluj',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="absolute inset-0 z-[500] flex items-center justify-center p-6"
          style={{ background: 'rgba(13,31,26,0.4)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={onCancel}
        >
          <motion.div
            className="w-full max-w-[320px] rounded-xl bg-bg-base px-6 pb-5 pt-7 text-center"
            initial={{ scale: 0.92 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.92 }}
            transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-2 font-serif text-[22px] tracking-[-0.01em]">{title}</div>
            <div className="mb-6 text-[14px] leading-relaxed text-ink-secondary">{body}</div>
            <div className="flex flex-col gap-2">
              <button
                onClick={onConfirm}
                className="rounded-md bg-alert px-5 py-[14px] text-[15px] font-medium text-white transition-all hover:brightness-95 active:scale-[0.98]"
              >
                {confirmLabel}
              </button>
              <button
                onClick={onCancel}
                className="rounded-md px-5 py-[14px] text-[15px] font-medium text-ink-secondary transition-colors hover:text-ink-primary"
              >
                {cancelLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
