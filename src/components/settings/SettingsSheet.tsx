import type { PanInfo } from 'framer-motion'
import type { ComponentType } from 'react'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { LifeBuoy, LogOut, Mail, MessageSquare } from 'lucide-react'
import { signOut } from '../../lib/auth'
import { Toggle } from '../ui/Toggle'
import { MessageSheet } from './MessageSheet'
import { useSettings, type Currency, type ReminderDays } from '../../store/settings'
import { useOnboarding } from '../../store/onboarding'
import { useSubscriptions } from '../../store/subscriptions'
import { useNotifications } from '../../store/notifications'

interface SettingsSheetProps {
  open: boolean
  onClose: () => void
}

const FEEDBACK_EMAIL = 'krzysztofabiniak@gmail.com'
const APP_VERSION = 'Wersja MVP 1.0.0'

/** Segment selector (jak type-toggle) dla 2-3 wzajemnie wykluczających się opcji. */
function Segmented<T extends string | number>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div
      className="grid gap-1 rounded-md border border-hairline bg-bg-card p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, 1fr)` }}
    >
      {options.map((o) => (
        <button
          key={String(o.value)}
          onClick={() => onChange(o.value)}
          className={clsx(
            'rounded-[9px] px-2 py-[10px] text-[13px] font-medium transition-all',
            value === o.value ? 'bg-accent text-bg-base' : 'text-ink-secondary',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">
      {children}
    </div>
  )
}

/** Wiersz nawigacyjny z chevronem (Pomoc / O aplikacji). */
function NavRow({
  label,
  onClick,
  href,
  disabled,
  badge,
  icon: Icon,
}: {
  label: string
  onClick?: () => void
  /** Jeśli ustawione → render jako anchor (np. mailto: otwiera natywnego klienta poczty). */
  href?: string
  disabled?: boolean
  badge?: string
  icon?: ComponentType<{ className?: string; strokeWidth?: number }>
}) {
  const className = clsx(
    'flex w-full items-center justify-between gap-3 px-5 py-4 text-left text-[14px] transition-colors',
    disabled ? 'cursor-not-allowed text-ink-tertiary' : 'text-ink-primary hover:bg-bg-subtle',
  )

  const inner = (
    <>
      <span className="flex min-w-0 items-center gap-3">
        {Icon && (
          <Icon
            className={clsx(
              'h-[18px] w-[18px] flex-shrink-0',
              disabled ? 'text-ink-tertiary' : 'text-ink-secondary',
            )}
            strokeWidth={1.6}
          />
        )}
        <span className="truncate">{label}</span>
      </span>
      {badge ? (
        <span className="flex-shrink-0 font-mono text-[9px] uppercase tracking-[0.1em] text-ink-tertiary">
          {badge}
        </span>
      ) : (
        <span className="flex-shrink-0 text-[16px] text-ink-tertiary">›</span>
      )}
    </>
  )

  // mailto: i podobne — anchor jest naturalnym targetem dla browsera
  // (otwiera natywnego klienta zamiast nawigować w nowej karcie).
  if (href && !disabled) {
    return (
      <a href={href} className={className} onClick={onClick}>
        {inner}
      </a>
    )
  }

  return (
    <button onClick={disabled ? undefined : onClick} disabled={disabled} className={className}>
      {inner}
    </button>
  )
}

export function SettingsSheet({ open, onClose }: SettingsSheetProps) {
  const navigate = useNavigate()
  const { notify, reminderDays, currency, setNotify, setReminderDays, setCurrency } = useSettings()
  const resetOnboarding = useOnboarding((s) => s.reset)
  const [messageOpen, setMessageOpen] = useState(false)

  const handleRestartOnboarding = () => {
    onClose()
    resetOnboarding()
    navigate('/onboarding', { replace: true })
  }

  const feedbackHref = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(
    'Feedback – MVP Ostatni Dzień',
  )}`

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
            {/* Uchwyt + nagłówek (obszar do przeciągania) */}
            <div className="flex-shrink-0 cursor-grab px-5 pt-3 active:cursor-grabbing">
              <div className="mx-auto mb-3 h-1 w-10 rounded-pill bg-hairline" />
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-serif text-[24px] tracking-[-0.02em]">Ustawienia</h2>
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

            {/* Treść — scrollowalna */}
            <div className="no-scrollbar flex-1 overflow-y-auto px-5 pb-8 pt-2">
              {/* Sekcja 1: Powiadomienia */}
              <div className="mb-6">
                <SectionLabel>Powiadomienia</SectionLabel>
                <div className="overflow-hidden rounded-lg border border-hairline bg-bg-card">
                  <div className="flex items-center justify-between gap-4 border-b border-hairline px-5 py-4">
                    <div className="min-w-0">
                      <div className="text-[14px] text-ink-primary">Ostrzegaj o płatnościach</div>
                      <div className="mt-1 text-[12px] leading-relaxed text-ink-secondary">
                        Wysyłamy przypomnienie, zanim usługa pobierze pieniądze.
                      </div>
                    </div>
                    <Toggle on={notify} onChange={setNotify} aria-label="Ostrzegaj o płatnościach" />
                  </div>

                  <div className={clsx('px-5 py-4 transition-opacity', !notify && 'pointer-events-none opacity-40')}>
                    <div className="mb-[10px] text-[14px] text-ink-primary">Kiedy przypomnieć?</div>
                    <Segmented<ReminderDays>
                      value={reminderDays}
                      onChange={setReminderDays}
                      options={[
                        { value: 1, label: '1 dzień' },
                        { value: 3, label: '3 dni' },
                        { value: 7, label: '7 dni' },
                      ]}
                    />
                  </div>
                </div>
              </div>

              {/* Sekcja 2: Preferencje */}
              <div className="mb-6">
                <SectionLabel>Preferencje</SectionLabel>
                <div className="rounded-lg border border-hairline bg-bg-card px-5 py-4">
                  <div className="mb-[10px] text-[14px] text-ink-primary">Domyślna waluta</div>
                  <Segmented<Currency>
                    value={currency}
                    onChange={setCurrency}
                    options={[
                      { value: 'PLN', label: 'PLN' },
                      { value: 'EUR', label: 'EUR' },
                      { value: 'USD', label: 'USD' },
                    ]}
                  />
                  <div className="mt-[10px] text-[12px] leading-relaxed text-ink-secondary">
                    Waluta, w której wyświetlamy główne podsumowanie.
                  </div>
                </div>
              </div>

              {/* Sekcja 3: Pomoc i wsparcie */}
              <div className="mb-6">
                <SectionLabel>Pomoc i wsparcie</SectionLabel>
                <div className="flex flex-col overflow-hidden rounded-lg border border-hairline bg-bg-card">
                  <div className="border-b border-hairline">
                    <NavRow
                      label="Jak dodać pierwszą subskrypcję?"
                      onClick={handleRestartOnboarding}
                      icon={LifeBuoy}
                    />
                  </div>
                  <div className="border-b border-hairline">
                    <NavRow
                      label="Napisz do nas wiadomość"
                      onClick={() => setMessageOpen(true)}
                      icon={MessageSquare}
                    />
                  </div>
                  <NavRow
                    label="Znalazłeś błąd? Napisz mailem"
                    href={feedbackHref}
                    onClick={onClose}
                    icon={Mail}
                  />
                </div>
              </div>

              {/* Sekcja 4: O aplikacji */}
              <div className="mb-6">
                <SectionLabel>O aplikacji</SectionLabel>
                <div className="flex flex-col overflow-hidden rounded-lg border border-hairline bg-bg-card">
                  <div className="border-b border-hairline">
                    <NavRow label="Polityka prywatności" disabled badge="Wkrótce" />
                  </div>
                  <NavRow label="Regulamin" disabled badge="Wkrótce" />
                </div>
              </div>

              {/* Sekcja: Demo */}
              <div className="mb-6">
                <SectionLabel>Dane demo</SectionLabel>
                <button
                  type="button"
                  onClick={async () => {
                    await useSubscriptions.getState().reseedDemo()
                    useNotifications.getState().push({
                      type: 'info',
                      title: 'Załadowano subskrypcje demo',
                      subtitle: '9 przykładowych subskrypcji z prawdziwymi logo zostało dodanych.',
                    })
                    onClose()
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-hairline bg-bg-card px-5 py-4 text-[14px] font-medium text-ink-primary transition-all duration-150 hover:border-accent hover:text-accent active:scale-[0.98]"
                >
                  Załaduj subskrypcje demo
                </button>
                <p className="mt-2 px-1 text-[12px] text-ink-tertiary">
                  Zastąpi obecną listę 9 przykładowymi subskrypcjami (Adobe z statusem „Uwaga”, Netflix, Disney+, ChatGPT i inne).
                </p>
              </div>

              {/* Sekcja 5: Konto */}
              <div className="mb-6">
                <SectionLabel>Konto</SectionLabel>
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    void signOut()
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-alert px-5 py-4 text-[15px] font-medium text-white transition-all duration-150 hover:brightness-95 active:scale-[0.98]"
                >
                  <LogOut className="h-[18px] w-[18px]" strokeWidth={2} />
                  Wyloguj się
                </button>
              </div>

              {/* Stopka */}
              <div className="text-center font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">
                {APP_VERSION}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      <MessageSheet
        open={messageOpen}
        onClose={() => setMessageOpen(false)}
        subject="Wiadomość – Ostatni Dzień"
        to={FEEDBACK_EMAIL}
        fallbackTo={FEEDBACK_EMAIL}
      />
    </AnimatePresence>
  )
}
