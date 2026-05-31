import clsx from 'clsx'
import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'tertiary' | 'critical'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-bg-base hover:bg-accent-hover',
  secondary: 'border border-hairline text-ink-primary hover:border-ink-tertiary',
  tertiary: 'text-accent hover:underline',
  critical: 'bg-alert text-white hover:brightness-95',
}

/**
 * Atomowy przycisk. W Fazie 1 używany minimalnie — pełnię na ekranie akcji (Faza 2).
 */
export function Button({ variant = 'primary', className, ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-md px-5 py-3',
        'font-sans text-[15px] font-medium transition-all duration-150 active:scale-[0.97]',
        VARIANTS[variant],
        className,
      )}
      {...props}
    />
  )
}
