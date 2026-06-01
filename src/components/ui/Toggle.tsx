import clsx from 'clsx'

interface ToggleProps {
  on: boolean
  onChange?: (next: boolean) => void
  'aria-label'?: string
}

/** Przełącznik on/off — zielony gdy włączony. Sterowany propsem `on`. */
export function Toggle({ on, onChange, 'aria-label': ariaLabel }: ToggleProps) {
  const inner = (
    <span
      className={clsx(
        'absolute h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform duration-200',
        on ? 'translate-x-[18px]' : 'translate-x-[2px]',
      )}
    />
  )

  const trackClass = clsx(
    'relative inline-flex h-[22px] w-[38px] flex-shrink-0 items-center rounded-pill transition-colors duration-200',
    on ? 'bg-accent' : 'bg-hairline',
  )

  // Jeśli przekazano onChange → renderujemy jako klikalny <button>; inaczej dekoracyjny <span>.
  if (onChange) {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={ariaLabel}
        onClick={() => onChange(!on)}
        className={trackClass}
      >
        {inner}
      </button>
    )
  }

  return <span className={trackClass}>{inner}</span>
}
