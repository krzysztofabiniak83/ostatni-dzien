/**
 * ActionChips — poziomy scrollowalny pasek z 5 gotowymi promptami.
 * Wyświetlany tylko gdy historia czatu pusta. Klik → autosend.
 */

const CHIPS = [
  'Ile wydaję miesięcznie?',
  'Co dubluje się w mojej liście?',
  'Najtańsze alternatywy do Netflix',
  'Jak anulować siłownię?',
  'Co odnowi się w tym tygodniu?',
]

export function ActionChips({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <div
      className="action-chips -mx-4 mb-3 flex gap-2 overflow-x-auto overflow-y-hidden px-4 pb-1"
      style={{
        scrollbarWidth: 'none',
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-x',
        overscrollBehaviorX: 'contain',
        cursor: 'grab',
      }}
    >
      {CHIPS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onPick(c)}
          className="shrink-0 rounded-full border border-hairline bg-bg-card px-3.5 py-2 text-[13px] font-medium text-ink-primary transition-all duration-150 hover:border-accent hover:text-accent active:scale-[0.96]"
        >
          {c}
        </button>
      ))}
    </div>
  )
}
