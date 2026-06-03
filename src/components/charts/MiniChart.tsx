import clsx from 'clsx'
import { useFormatAmount } from '../../utils/currency'

interface MiniChartProps {
  heights: number[]
  /** Suma 6 miesięcy w groszach (PLN). 0 → tryb pusty (trial). */
  totalPLN: number
}

// Etykiety 6 ostatnich miesięcy (kończąc na bieżącym — maj 2026).
const MONTHS = ['Gru', 'Sty', 'Lut', 'Mar', 'Kwi', 'Maj']

/**
 * Mini-wykres ostatnich 6 miesięcy. Ostatni słupek (bieżący miesiąc) = aktywny.
 * Dla triali (totalPLN === 0) słupki są zerowe → pokazujemy notkę.
 */
export function MiniChart({ heights, totalPLN }: MiniChartProps) {
  const fmt = useFormatAmount()
  const isEmpty = totalPLN === 0
  const total = fmt(totalPLN)

  return (
    <div className="mb-4 rounded-lg border border-hairline bg-bg-card p-5">
      <div className="mb-5 flex items-baseline justify-between">
        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">
          Ostatnie 6 miesięcy
        </div>
        <div className="font-serif text-[20px] tracking-[-0.02em]">{total}</div>
      </div>

      <div className="mb-[10px] flex h-20 items-end justify-between gap-2">
        {heights.map((h, i) => {
          const isLast = i === heights.length - 1
          return (
            <div key={i} className="flex flex-1 flex-col items-center gap-[6px]">
              <div
                className={clsx(
                  'w-full rounded-[4px_4px_2px_2px]',
                  isLast && !isEmpty ? 'bg-accent' : 'bg-accent-soft',
                )}
                style={{ height: `${Math.max(h, 4)}px` }}
              />
              <div
                className={clsx(
                  'font-mono text-[9px] uppercase tracking-[0.08em]',
                  isLast && !isEmpty ? 'font-semibold text-accent' : 'text-ink-tertiary',
                )}
              >
                {MONTHS[i]}
              </div>
            </div>
          )
        })}
      </div>

      {isEmpty && (
        <div className="mt-2 text-center text-[12px] text-ink-tertiary">
          Brak wcześniejszych opłat — to pierwsze pobranie
        </div>
      )}
    </div>
  )
}
