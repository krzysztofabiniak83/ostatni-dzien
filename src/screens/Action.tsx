import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import clsx from 'clsx'
import { Bell, BellOff, Pencil, Trash2 } from 'lucide-react'
import { StatusBar } from '../components/layout/StatusBar'
import { SubLogo } from '../components/cards/SubLogo'
import { Tag } from '../components/ui/Tag'
import { MiniChart } from '../components/charts/MiniChart'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { InstructionSheet } from '../components/action/InstructionSheet'
import { Toast } from '../components/ui/Toast'
import { Toggle } from '../components/ui/Toggle'
import { useFormatAmount } from '../utils/currency'
import { useSubscriptions } from '../store/subscriptions'

function ExternalIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M15 3h6v6M10 14L21 3M21 14v7H3V3h7" />
    </svg>
  )
}

function DocIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M9 13h6M9 17h4" />
    </svg>
  )
}

export function Action() {
  const { id } = useParams()
  const navigate = useNavigate()
  const sub = useSubscriptions((s) => (id ? s.getById(id) : undefined))
  const remove = useSubscriptions((s) => s.remove)
  const fmt = useFormatAmount()

  const [showDelete, setShowDelete] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [muted, setMuted] = useState(false)

  // Subskrypcja usunięta/nieznana → wróć na dashboard.
  if (!sub) {
    navigate('/', { replace: true })
    return null
  }

  const isCritical = sub.urgency === 'today'
  const shortName = sub.name.split(' ')[0]
  const timePart = sub.date.split('· ')[1]?.trim()

  const flashToast = (msg: string) => {
    setToast(msg)
    window.setTimeout(() => setToast(null), 1800)
  }

  const handleDeepLink = () => {
    const url = `https://www.google.com/search?q=${encodeURIComponent('anuluj subskrypcję ' + sub.name)}`
    window.open(url, '_blank', 'noopener,noreferrer')
    flashToast(`→ Otwieram stronę anulowania w ${shortName}`)
  }

  const handleDelete = () => {
    remove(sub.id)
    navigate('/', { replace: true })
  }

  return (
    <div
      className={clsx(
        'relative flex h-full w-full flex-col',
        isCritical ? 'bg-alert-bg' : 'bg-bg-base',
      )}
    >
      <StatusBar />

      {/* Header z przyciskiem wstecz */}
      <div className="flex flex-shrink-0 items-center justify-between p-4">
        <button
          aria-label="Wstecz"
          onClick={() => navigate('/')}
          className="flex h-[38px] w-[38px] items-center justify-center rounded-full border border-hairline bg-bg-card text-ink-primary transition-all hover:border-ink-secondary active:scale-[0.94]"
        >
          <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6}>
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      </div>

      <div className="no-scrollbar flex-1 overflow-y-auto px-6 pb-[80px] pt-2">
        {/* Hero */}
        <div className={clsx('text-center', isCritical ? 'pb-5 pt-6' : 'pb-6 pt-8')}>
          <SubLogo logoClass={sub.logoClass} logoText={sub.logoText} size="lg" />
          <div
            className={clsx(
              'mb-2 font-mono text-[10px] uppercase tracking-[0.14em]',
              isCritical ? 'text-alert opacity-90' : 'text-ink-tertiary',
            )}
          >
            {isCritical
              ? 'Próbny okres kończy się'
              : sub.type === 'trial'
                ? 'Próbny okres kończy się za'
                : 'Pobranie za'}
          </div>

          {isCritical ? (
            <div className="font-serif text-[112px] font-light leading-[0.9] tracking-[-0.04em] text-alert">
              Dziś
            </div>
          ) : (
            <div className="font-serif text-[84px] font-light leading-[0.9] tracking-[-0.04em]">
              {sub.daysUntil}
              <span className="ml-[-8px] font-serif text-[32px] font-light italic"> dni</span>
            </div>
          )}

          <div
            className={clsx(
              'mt-1 text-[13px]',
              isCritical ? 'text-alert opacity-80' : 'text-ink-secondary',
            )}
          >
            {isCritical ? `o ${timePart} · 31 maja` : sub.date}
          </div>
        </div>

        {/* Karta kwoty */}
        <div
          className={clsx(
            'mb-4 flex items-center justify-between rounded-lg border bg-bg-card px-6 py-5',
            isCritical ? 'border-alert/20' : 'border-hairline',
          )}
        >
          <div>
            <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">
              {isCritical ? 'Pierwsza opłata' : 'Kwota'}
            </div>
            <div className="font-serif text-[28px] tracking-[-0.02em]">{fmt(sub.amountPLN)}</div>
            <div className="mt-[2px] text-[12px] text-ink-secondary">
              {isCritical ? 'jednorazowo, potem miesięcznie' : sub.period}
            </div>
          </div>
          <Tag type={sub.type} />
        </div>

        {/* CTA */}
        <div className="mb-6 flex flex-col gap-2">
          <button
            onClick={handleDeepLink}
            className={clsx(
              'flex items-center justify-center gap-2 rounded-[14px] px-5 py-[17px] text-[15px] font-medium text-bg-base transition-all active:scale-[0.98]',
              isCritical ? 'bg-alert hover:brightness-95' : 'bg-accent hover:bg-accent-hover',
            )}
          >
            <ExternalIcon />
            Anuluj w {shortName}
          </button>
          <button
            onClick={() => setShowInstructions(true)}
            className="flex items-center justify-center gap-2 rounded-[14px] border border-hairline bg-bg-card px-5 py-[17px] text-[15px] font-medium text-ink-primary transition-all hover:border-ink-secondary active:scale-[0.98]"
          >
            <DocIcon />
            Pokaż instrukcję
          </button>
        </div>

        {/* Mini-wykres */}
        <MiniChart heights={sub.chartHeights} totalPLN={sub.chartTotalPLN} />

        {/* Akcje drugorzędne */}
        <div className="flex flex-col overflow-hidden rounded-lg border border-hairline bg-bg-card">
          <button
            onClick={() => {
              const next = !muted
              setMuted(next)
              flashToast(next ? 'Powiadomienia wyciszone' : 'Powiadomienia włączone')
            }}
            className="flex w-full items-center justify-between border-b border-hairline px-5 py-4 text-left text-[14px] text-ink-primary transition-colors hover:bg-bg-subtle"
          >
            <span className="flex items-center gap-3">
              {muted ? (
                <BellOff className="h-[18px] w-[18px] text-ink-tertiary" strokeWidth={1.6} />
              ) : (
                <Bell className="h-[18px] w-[18px] text-ink-secondary" strokeWidth={1.6} />
              )}
              Wycisz powiadomienia
            </span>
            <Toggle on={muted} />
          </button>
          <button
            onClick={() => flashToast('Edycja danych — wkrótce')}
            className="flex w-full items-center justify-between border-b border-hairline px-5 py-4 text-left text-[14px] text-ink-primary transition-colors hover:bg-bg-subtle"
          >
            <span className="flex items-center gap-3">
              <Pencil className="h-[18px] w-[18px] text-ink-secondary" strokeWidth={1.6} />
              Edytuj dane subskrypcji
            </span>
            <span className="text-[16px] text-ink-tertiary">›</span>
          </button>
          <button
            onClick={() => setShowDelete(true)}
            className="flex w-full items-center justify-between px-5 py-4 text-left text-[14px] text-alert transition-colors hover:bg-bg-subtle"
          >
            <span className="flex items-center gap-3">
              <Trash2 className="h-[18px] w-[18px]" strokeWidth={1.6} />
              Usuń z listy
            </span>
            <span className="text-[16px] text-ink-tertiary">›</span>
          </button>
        </div>
      </div>

      {/* Bottom fade */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0 z-10 h-[60px]"
        style={{
          background: `linear-gradient(to top, ${isCritical ? '#FAF1EC' : '#F5F3EE'} 30%, transparent)`,
        }}
      />

      <InstructionSheet
        open={showInstructions}
        serviceName={sub.name}
        onClose={() => setShowInstructions(false)}
      />

      <ConfirmDialog
        open={showDelete}
        title="Usunąć z listy?"
        body={
          <>
            Subskrypcja zniknie z aplikacji. Jeśli chcesz{' '}
            <strong className="font-medium text-ink-primary">faktycznie anulować</strong> usługę,
            użyj przycisku „Anuluj w {shortName}".
          </>
        }
        confirmLabel="Usuń z listy"
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />

      <Toast message={toast} />
    </div>
  )
}
