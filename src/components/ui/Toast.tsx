import { AnimatePresence, motion } from 'framer-motion'

interface ToastProps {
  message: string | null
}

/** Krótki komunikat na dole ekranu. Sterowany z zewnątrz (message=null → ukryty). */
export function Toast({ message }: ToastProps) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          className="absolute bottom-[110px] left-1/2 z-[400] max-w-[90%] whitespace-nowrap rounded-md bg-ink-primary px-5 py-[14px] text-[13px] font-medium text-bg-base shadow-[0_12px_32px_-8px_rgba(13,31,26,0.4)]"
          initial={{ opacity: 0, y: 40, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          exit={{ opacity: 0, y: 40, x: '-50%' }}
          transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
