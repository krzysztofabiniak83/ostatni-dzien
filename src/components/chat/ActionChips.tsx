import { useRef } from 'react'

/**
 * ActionChips — poziomy scrollowalny pasek z 5 gotowymi promptami.
 * Wyświetlany tylko gdy historia czatu pusta. Klik → autosend.
 *
 * Scroll:
 * - Mobile: natywny touch (touch-action: pan-x).
 * - Desktop: drag-to-scroll myszką (mousedown + move). Klik bez przeciągnięcia
 *   nadal wysyła chip — odróżniamy je po dystansie ruchu.
 */

const CHIPS = [
  'Ile wydaję miesięcznie?',
  'Co dubluje się w mojej liście?',
  'Najtańsze alternatywy do Netflix',
  'Jak anulować siłownię?',
  'Co odnowi się w tym tygodniu?',
]

export function ActionChips({ onPick }: { onPick: (prompt: string) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  const drag = useRef({ active: false, startX: 0, startScroll: 0, moved: 0 })

  function onMouseDown(e: React.MouseEvent) {
    const el = ref.current
    if (!el) return
    drag.current = { active: true, startX: e.clientX, startScroll: el.scrollLeft, moved: 0 }
    el.style.cursor = 'grabbing'
  }

  function onMouseMove(e: React.MouseEvent) {
    const el = ref.current
    if (!el || !drag.current.active) return
    const dx = e.clientX - drag.current.startX
    el.scrollLeft = drag.current.startScroll - dx
    drag.current.moved = Math.max(drag.current.moved, Math.abs(dx))
  }

  function endDrag() {
    const el = ref.current
    if (el) el.style.cursor = 'grab'
    drag.current.active = false
  }

  function handleChipClick(prompt: string, e: React.MouseEvent) {
    // Jeśli to było faktyczne przeciągnięcie (>5px) — to nie klik, ignoruj.
    if (drag.current.moved > 5) {
      e.preventDefault()
      return
    }
    onPick(prompt)
  }

  return (
    <div
      ref={ref}
      className="action-chips -mx-4 mb-3 flex gap-2 overflow-x-auto overflow-y-hidden px-4 pb-1"
      style={{
        scrollbarWidth: 'none',
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-x',
        overscrollBehaviorX: 'contain',
        cursor: 'grab',
        userSelect: 'none',
      }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
    >
      {CHIPS.map((c) => (
        <button
          key={c}
          type="button"
          onClick={(e) => handleChipClick(c, e)}
          className="shrink-0 rounded-full border border-hairline bg-bg-card px-3.5 py-2 text-[13px] font-medium text-ink-primary transition-all duration-150 hover:border-accent hover:text-accent active:scale-[0.96]"
        >
          {c}
        </button>
      ))}
    </div>
  )
}
