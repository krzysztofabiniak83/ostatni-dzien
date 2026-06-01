import { useEffect } from 'react'
import { AnimatePresence, motion, type PanInfo } from 'framer-motion'
import clsx from 'clsx'
import { BellOff, Check, Trash2 } from 'lucide-react'
import { SubLogo } from '../cards/SubLogo'
import { useNotifications, type Notification } from '../../store/notifications'
import { formatRelativeTime } from '../../utils/notifications'

interface NotificationsSheetProps {
  open: boolean
  onClose: () => void
}

function SystemIcon({ system }: { system: NonNullable<Notification['iconSystem']> }) {
  if (system === 'trash') {
    return (
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-alert-soft text-alert">
        <Trash2 className="h-[18px] w-[18px]" strokeWidth={1.6} />
      </div>
    )
  }
  return (
    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-accent-soft text-accent">
      <Check className="h-[18px] w-[18px]" strokeWidth={2} />
    </div>
  )
}

function Row({ item }: { item: Notification }) {
  return (
    <div
      className={clsx(
        'relative flex gap-3 px-5 py-4 transition-colors',
        !item.read && 'bg-accent-soft/30',
      )}
    >
      {/* Lewy znacznik nieprzeczytanego — drobna terakotowa kropka dla krytycznego */}
      {!item.read && item.type === 'critical' && (
        <span className="absolute left-2 top-1/2 h-[6px] w-[6px] -translate-y-1/2 rounded-full bg-alert" />
      )}

      {item.iconSystem ? (
        <SystemIcon system={item.iconSystem} />
      ) : item.logoClass ? (
        <SubLogo logoClass={item.logoClass} logoText={item.logoText ?? ''} />
      ) : (
        <SystemIcon system="check" />
      )}

      <div className="min-w-0 flex-1">
        <div
          className={clsx(
            'text-[14px] leading-snug tracking-[-0.005em] text-ink-primary',
            !item.read && 'font-medium',
          )}
        >
          {item.title}
        </div>
        <div className="mt-[2px] text-[12px] leading-relaxed text-ink-secondary">{item.subtitle}</div>
        <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-tertiary">
          {formatRelativeTime(item.createdAt)}
        </div>
      </div>
    </div>
  )
}

export function NotificationsSheet({ open, onClose }: NotificationsSheetProps) {
  const items = useNotifications((s) => s.items)
  const markAllRead = useNotifications((s) => s.markAllRead)

  // Otwarcie listy = przeczytane wszystko (zgodnie z briefem: minimalizujemy tarcie).
  useEffect(() => {
    if (open) {
      // Małe opóźnienie żeby user zobaczył "nieprzeczytane" tło na moment przed wygaszeniem.
      const t = window.setTimeout(() => markAllRead(), 350)
      return () => window.clearTimeout(t)
    }
  }, [open, markAllRead])

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 80) onClose()
  }

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
            {/* Uchwyt + nagłówek */}
            <div className="flex-shrink-0 cursor-grab px-5 pt-3 active:cursor-grabbing">
              <div className="mx-auto mb-3 h-1 w-10 rounded-pill bg-hairline" />
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-serif text-[24px] tracking-[-0.02em]">Powiadomienia</h2>
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
            </div>

            {/* Lista lub pusty stan */}
            <div className="no-scrollbar flex-1 overflow-y-auto pb-8">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-bg-card">
                    <BellOff className="h-5 w-5 text-ink-tertiary" strokeWidth={1.6} />
                  </div>
                  <div className="font-serif text-[18px] tracking-[-0.01em] text-ink-primary">
                    Cisza w eterze
                  </div>
                  <div className="mt-1 max-w-[280px] text-[13px] leading-relaxed text-ink-secondary">
                    Tu pojawią się alerty o zbliżających się pobraniach i potwierdzenia akcji.
                  </div>
                </div>
              ) : (
                <div className="flex flex-col divide-y divide-hairline/70">
                  {items.map((item) => (
                    <Row key={item.id} item={item} />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
