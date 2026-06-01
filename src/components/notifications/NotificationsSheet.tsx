import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion, type PanInfo } from 'framer-motion'
import clsx from 'clsx'
import { BellOff, Check, Trash2 } from 'lucide-react'
import { SubLogo } from '../cards/SubLogo'
import { useNotifications, type Notification } from '../../store/notifications'
import { useSubscriptions } from '../../store/subscriptions'
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

interface RowProps {
  item: Notification
  /** Tylko najnowsze nieprzeczytane dostaje pełny styl "fresh"; reszta — stonowana. */
  fresh: boolean
  onClick?: () => void
}

function Row({ item, fresh, onClick }: RowProps) {
  const clickable = !!onClick

  const inner = (
    <>
      {/* Lewy znacznik świeżego — drobna terakotowa kropka dla critical */}
      {fresh && item.type === 'critical' && (
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
            'leading-snug tracking-[-0.005em]',
            fresh
              ? 'text-[14px] font-medium text-ink-primary'
              : 'text-[13px] font-normal text-ink-secondary',
          )}
        >
          {item.title}
        </div>
        <div
          className={clsx(
            'mt-[2px] leading-relaxed',
            fresh ? 'text-[12px] text-ink-secondary' : 'text-[11px] text-ink-tertiary',
          )}
        >
          {item.subtitle}
        </div>
        <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-tertiary">
          {formatRelativeTime(item.createdAt)}
        </div>
      </div>

      {clickable && (
        <span className="self-center text-[16px] text-ink-tertiary" aria-hidden="true">
          ›
        </span>
      )}
    </>
  )

  const className = clsx(
    'relative flex gap-3 px-5 py-4 text-left transition-colors',
    fresh && 'bg-accent-soft/30',
    clickable && 'cursor-pointer hover:bg-bg-subtle/80 active:scale-[0.995]',
  )

  if (clickable) {
    return (
      <button type="button" onClick={onClick} className={clsx('w-full', className)}>
        {inner}
      </button>
    )
  }

  return <div className={className}>{inner}</div>
}

export function NotificationsSheet({ open, onClose }: NotificationsSheetProps) {
  const items = useNotifications((s) => s.items)
  const markAllRead = useNotifications((s) => s.markAllRead)
  const subscriptions = useSubscriptions((s) => s.subscriptions)
  const navigate = useNavigate()

  // Otwarcie listy = przeczytane wszystko (zgodnie z briefem: minimalizujemy tarcie).
  useEffect(() => {
    if (open) {
      // Małe opóźnienie żeby user zobaczył "nieprzeczytane" tło na moment przed wygaszeniem.
      const t = window.setTimeout(() => markAllRead(), 350)
      return () => window.clearTimeout(t)
    }
  }, [open, markAllRead])

  const handleOpen = (subId: string) => {
    onClose()
    navigate(`/sub/${subId}`)
  }

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
                  {items.map((item, idx) => {
                    // Tylko najnowsze nieprzeczytane dostaje pełen styl "fresh".
                    const fresh = idx === 0 && !item.read
                    // Klikalne tylko gdy subId jest podane i subskrypcja jeszcze istnieje
                    // (po usunięciu nie ma do czego nawigować).
                    const subExists = item.subId
                      ? subscriptions.some((s) => s.id === item.subId)
                      : false
                    return (
                      <Row
                        key={item.id}
                        item={item}
                        fresh={fresh}
                        onClick={subExists && item.subId ? () => handleOpen(item.subId!) : undefined}
                      />
                    )
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
