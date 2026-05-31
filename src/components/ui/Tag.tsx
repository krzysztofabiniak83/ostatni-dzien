import clsx from 'clsx'
import type { SubscriptionType } from '../../types/subscription'

interface TagProps {
  type: SubscriptionType
}

const LABEL: Record<SubscriptionType, string> = {
  trial: 'Próbny',
  renewal: 'Odnowienie',
}

/** Tag typu subskrypcji: trial (zielony fill) / renewal (outline). */
export function Tag({ type }: TagProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-[5px] rounded-pill px-2 py-[3px]',
        'font-mono text-[9px] font-medium uppercase tracking-[0.1em]',
        type === 'trial'
          ? 'bg-accent text-bg-base'
          : 'border border-hairline text-ink-secondary',
      )}
    >
      <span className="h-1 w-1 rounded-full bg-current" />
      {LABEL[type]}
    </span>
  )
}
