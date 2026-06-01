import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { SubCard } from '../components/cards/SubCard'
import { SectionDivider } from '../components/layout/SectionDivider'
import { StatusBar } from '../components/layout/StatusBar'
import { Toast } from '../components/ui/Toast'
import { SmartInputFlow } from '../components/smartinput/SmartInputFlow'
import { SettingsSheet } from '../components/settings/SettingsSheet'
import { NotificationsSheet } from '../components/notifications/NotificationsSheet'
import { useSubscriptions } from '../store/subscriptions'
import { useSettings } from '../store/settings'
import { useNotifications } from '../store/notifications'
import { buildPaymentAlerts } from '../utils/notifications'
import type { Section, Subscription } from '../types/subscription'

const SECTIONS: { key: Section; label: string }[] = [
  { key: 'today', label: 'Dziś' },
  { key: 'week', label: 'Ten tydzień' },
  { key: 'month', label: 'Ten miesiąc' },
  { key: 'later', label: 'Później' },
]

const MONTH_TOTAL = '434,96 zł'

function IconButton({
  children,
  label,
  onClick,
  badge,
}: {
  children: ReactNode
  label: string
  onClick?: () => void
  /** Czerwona kropka (Centrum Powiadomień). */
  badge?: boolean
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className="relative flex h-[38px] w-[38px] items-center justify-center rounded-full border border-hairline bg-bg-card transition-all duration-150 hover:border-ink-tertiary active:scale-[0.94]"
    >
      {children}
      {badge && (
        <span
          aria-label="Nowe powiadomienia"
          className="absolute right-[5px] top-[5px] h-[8px] w-[8px] rounded-full bg-alert ring-2 ring-bg-card"
        />
      )}
    </button>
  )
}

export function Dashboard() {
  const subscriptions = useSubscriptions((s) => s.subscriptions)
  const lastAddedId = useSubscriptions((s) => s.lastAddedId)
  const clearLastAdded = useSubscriptions((s) => s.clearLastAdded)
  const notify = useSettings((s) => s.notify)
  const reminderDays = useSettings((s) => s.reminderDays)
  const pushNotification = useNotifications((s) => s.push)
  const navigate = useNavigate()

  // Sprawdź alerty płatności przy mount + zmianach (subscriptions / reminderDays / notify).
  // Dedup po metaKey w store — nie duplikujemy alertu dla tej samej subskrypcji w tym samym dniu.
  useEffect(() => {
    if (!notify) return
    const alerts = buildPaymentAlerts(subscriptions, reminderDays)
    alerts.forEach((a) => pushNotification(a))
  }, [subscriptions, reminderDays, notify, pushNotification])

  // Po onboardingu CTA z ostatniego slajdu zostawia flagę w sessionStorage
  // (przeżywa redirect, nie przeżywa zamknięcia karty).
  const initialAdding = (() => {
    try {
      if (sessionStorage.getItem('open-adder-after-onboarding') === '1') {
        sessionStorage.removeItem('open-adder-after-onboarding')
        return true
      }
    } catch {
      // ignore
    }
    return false
  })()
  const [adding, setAdding] = useState(initialAdding)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const unreadCount = useNotifications((s) => s.items.filter((it) => !it.read).length)
  const [toast, setToast] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const bySection = (key: Section): Subscription[] =>
    subscriptions.filter((s) => s.section === key)

  const handleCardClick = (sub: Subscription) => {
    navigate(`/sub/${sub.id}`)
  }

  const flashToast = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 2400)
  }

  // Po dodaniu subskrypcji: przewiń listę na górę i wygaś highlight.
  useEffect(() => {
    if (!lastAddedId) return
    listRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
    const t = window.setTimeout(() => clearLastAdded(), 2200)
    return () => window.clearTimeout(t)
  }, [lastAddedId, clearLastAdded])

  return (
    <>
      <StatusBar />

      {/* Header + hero stat */}
      <div className="flex-shrink-0 px-6 pb-5 pt-4">
        <div className="mb-6 flex items-center justify-between">
          <div className="font-serif text-[22px] font-normal tracking-[-0.02em] text-ink-primary">
            Ostatni <em className="font-light not-italic text-accent">Dzień</em>
          </div>
          <div className="flex gap-2">
            <IconButton
              label="Powiadomienia"
              onClick={() => setNotificationsOpen(true)}
              badge={unreadCount > 0}
            >
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="#0D1F1A" strokeWidth={1.6}>
                <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
                <path d="M10 21a2 2 0 0 0 4 0" />
              </svg>
            </IconButton>
            <IconButton label="Ustawienia" onClick={() => setSettingsOpen(true)}>
              <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="#0D1F1A" strokeWidth={1.6}>
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </IconButton>
          </div>
        </div>

        <div className="py-1">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">
            Nadchodzące pobrania
          </div>
          <div className="font-serif text-[36px] font-light leading-[1.05] tracking-[-0.02em] text-ink-primary">
            <strong className="font-medium">{subscriptions.length} subskrypcji</strong>
            <br />
            <em className="italic text-accent">{MONTH_TOTAL}</em> w tym miesiącu
          </div>
        </div>
      </div>

      {/* Scrollowalna lista sekcji */}
      <div ref={listRef} className="no-scrollbar relative flex-1 overflow-y-auto px-6 pb-[120px]">
        {SECTIONS.map((section, idx) => {
          const items = bySection(section.key)
          if (items.length === 0) return null
          return (
            <div key={section.key}>
              <SectionDivider label={section.label} className={idx === 0 ? 'mb-3' : 'mb-3 mt-7'} />
              <div className="flex flex-col gap-[10px]">
                {items.map((sub) => (
                  <SubCard
                    key={sub.id}
                    sub={sub}
                    onClick={handleCardClick}
                    highlight={sub.id === lastAddedId}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Bottom fade */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-[100px]"
        style={{ background: 'linear-gradient(to top, #F5F3EE 30%, transparent)' }}
      />

      {/* FAB — otwiera Smart Input */}
      <button
        aria-label="Dodaj subskrypcję"
        onClick={() => setAdding(true)}
        className="absolute bottom-8 right-6 z-50 flex h-[60px] w-[60px] items-center justify-center rounded-full bg-accent text-bg-base transition-all duration-200 hover:-translate-y-0.5 hover:bg-accent-hover active:scale-[0.94]"
        style={{ boxShadow: '0 12px 28px -8px rgba(31,61,51,0.5), 0 4px 12px -4px rgba(31,61,51,0.3)' }}
      >
        <svg viewBox="0 0 24 24" className="h-[22px] w-[22px]" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>

      {adding && <SmartInputFlow onExit={() => setAdding(false)} onToast={flashToast} />}

      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <NotificationsSheet open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />

      <Toast message={toast} />
    </>
  )
}
