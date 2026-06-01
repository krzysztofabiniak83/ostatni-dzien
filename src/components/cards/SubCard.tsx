import clsx from 'clsx'
import { Tag } from '../ui/Tag'
import { SubLogo } from './SubLogo'
import type { Subscription } from '../../types/subscription'

interface SubCardProps {
  sub: Subscription
  onClick?: (sub: Subscription) => void
  /** Podświetlenie świeżo dodanej karty (glow). */
  highlight?: boolean
}

function AlertGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-[9px] w-[9px]" fill="none" stroke="currentColor" strokeWidth={2.2}>
      <path d="M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    </svg>
  )
}

/**
 * Karta subskrypcji — 3 kolumny (licznik | info | logo).
 * Warianty: today (gradient + subtelny eyebrow "Uwaga"), critical (lewy border terracotta).
 */
export function SubCard({ sub, onClick, highlight }: SubCardProps) {
  const isToday = sub.urgency === 'today'
  const isCritical = sub.urgency === 'critical' || isToday
  // Część czasowa daty, np. "Dziś · 23:59" → "23:59".
  const timePart = sub.date.split('· ')[1]?.trim()

  return (
    <div
      onClick={() => onClick?.(sub)}
      className={clsx(
        'relative grid cursor-pointer grid-cols-[72px_1fr_44px] items-center gap-[14px]',
        'rounded-[18px] border border-hairline bg-bg-card p-[18px] pl-5',
        'transition-all duration-150 hover:border-ink-tertiary active:scale-[0.985]',
        isCritical && 'border-l-[3px] border-l-alert',
        highlight && 'new-card',
      )}
      style={
        isToday
          ? {
              background: 'linear-gradient(180deg, #FFFFFF 0%, #FAF1EC 100%)',
              borderColor: 'rgba(184,92,60,0.3)',
              borderLeftColor: '#B85C3C',
              boxShadow: '0 4px 16px -8px rgba(184,92,60,0.25)',
            }
          : undefined
      }
    >
      {/* Licznik */}
      <div className="text-left">
        {isToday ? (
          <>
            <div className="font-serif text-[30px] font-normal italic leading-none text-alert">
              Dziś
            </div>
            <div className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-tertiary">
              o {timePart}
            </div>
          </>
        ) : (
          <>
            <div
              className={clsx(
                'font-serif text-[46px] font-light leading-[0.88] tracking-[-0.04em]',
                isCritical ? 'text-alert' : 'text-ink-primary',
              )}
            >
              {sub.daysUntil}
            </div>
            <div
              className={clsx(
                'mt-1 font-mono text-[9px] uppercase tracking-[0.14em]',
                isCritical ? 'text-alert/80' : 'text-ink-tertiary',
              )}
            >
              dni
            </div>
          </>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0">
        {isToday && (
          <div className="mb-[3px] flex items-center gap-[5px] font-mono text-[9px] font-medium uppercase tracking-[0.14em] text-alert">
            <AlertGlyph />
            Uwaga
          </div>
        )}
        <div className="mb-[3px] overflow-hidden text-ellipsis whitespace-nowrap text-[15px] font-medium tracking-[-0.01em] text-ink-primary">
          {sub.name}
        </div>
        <div className="mb-2 text-[12px] text-ink-secondary">
          <strong className="font-medium text-ink-primary">{sub.amount}</strong> · {sub.periodShort}
        </div>
        <div className="flex flex-wrap gap-[5px]">
          <Tag type={sub.type} />
        </div>
      </div>

      {/* Logo */}
      <SubLogo logoClass={sub.logoClass} logoText={sub.logoText} />
    </div>
  )
}
