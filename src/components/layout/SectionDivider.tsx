interface SectionDividerProps {
  label: string
  className?: string
}

/** Nagłówek sekcji: mono label + cienka linia. */
export function SectionDivider({ label, className }: SectionDividerProps) {
  return (
    <div className={`flex items-center gap-3 ${className ?? ''}`}>
      <span className="flex-shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">
        {label}
      </span>
      <span className="h-px flex-1 bg-hairline" />
    </div>
  )
}
