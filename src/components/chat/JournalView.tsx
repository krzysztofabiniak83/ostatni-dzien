import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  CATEGORY_META,
  MOCK_JOURNAL,
  groupByDate,
  type JournalEntry,
} from '../../data/journal'
import { supabase } from '../../lib/supabase'

/**
 * Dzienniczek Rozmów — pełnoekranowa nakładka wewnątrz ChatSheet.
 * - U góry: poziomy kalendarz karuzelowy (scroll-snap na dni).
 *   Dni bez wpisów = opacity 0.4 i nieinteraktywne; auto-snap do najbliższego dnia z wpisem.
 * - Poniżej: wertykalna lista kart konwersacji dla wybranego dnia.
 */

const PL_MONTHS = [
  'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
  'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
]
const PL_WEEKDAYS = ['Nd', 'Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb']

/**
 * Generuje listę 60 dni wstecz + dziś (najstarsze pierwsze).
 * Liczymy bezpośrednio w UTC, żeby nie złapać duplikatu/luki przy DST.
 */
function buildDayWindow(): string[] {
  const out: string[] = []
  const now = new Date()
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  const DAY = 86_400_000
  for (let i = 60; i >= 0; i--) {
    const iso = new Date(todayUtc - i * DAY).toISOString().slice(0, 10)
    out.push(iso)
  }
  return out
}

export function JournalView({ open, onClose }: { open: boolean; onClose: () => void }) {
  const reduce = useReducedMotion()
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(false)
  const grouped = useMemo(() => groupByDate(entries), [entries])
  const days = useMemo(buildDayWindow, [])
  const daysWithEntries = useMemo(
    () => new Set(Object.keys(grouped)),
    [grouped],
  )

  // Pobranie realnych konwersacji po otwarciu dzienniczka.
  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    ;(async () => {
      let real: JournalEntry[] = []
      try {
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData.session?.access_token
        if (token) {
          const res = await fetch('/api/journal', {
            headers: { Authorization: `Bearer ${token}` },
          })
          // Tylko parsujemy gdy serwer zwrócił JSON. Na dev Vite serwuje TS jako tekst
          // i wtedy spadamy do mocków zamiast pokazywać "Unexpected token".
          const ctype = res.headers.get('content-type') ?? ''
          if (res.ok && ctype.includes('application/json')) {
            const body = (await res.json()) as {
              conversations?: Array<{
                id: string
                startedAt: string
                endedAt: string
                category: JournalEntry['category']
                title: string
                summary: string
              }>
            }
            real = (body.conversations ?? []).map((c) => {
              const start = new Date(c.startedAt)
              const end = new Date(c.endedAt)
              const fmt = (d: Date) =>
                `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
              return {
                id: c.id,
                date: start.toISOString().slice(0, 10),
                startTime: fmt(start),
                endTime: fmt(end),
                category: c.category,
                title: c.title,
                summary: c.summary,
              }
            })
          }
        }
      } catch {
        /* swallow — i tak fallback do mocków */
      }
      if (cancelled) return
      // MVP demo: gdy user nie ma jeszcze realnych konwersacji, pokazujemy mocki
      // żeby zobaczył jak dzienniczek będzie wyglądał. Realne wpisy zawsze wygrywają.
      setEntries(real.length > 0 ? real : MOCK_JOURNAL)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [open])

  // Najnowszy dzień z wpisami (albo null gdy wpisy jeszcze się ładują).
  const newestWithEntries = useMemo(() => {
    if (daysWithEntries.size === 0) return null
    for (let i = days.length - 1; i >= 0; i--) {
      if (daysWithEntries.has(days[i])) return days[i]
    }
    return null
  }, [days, daysWithEntries])

  // Aktywny dzień. `null` dopóki nie wiemy który dzień ma wpisy — nie ustawiamy
  // fallbacku na dzisiaj (powodowało race: karuzela centrowała się na dziś,
  // potem snap-timer mógł podchwycić inny pusty dzień gdy wpisy dopadły).
  const [active, setActive] = useState<string | null>(null)

  // Sync: gdy wpisy się załadują → ustaw aktywny na najnowszy z wpisami.
  // Po zamknięciu: reset (następne otwarcie znów wskoczy na najnowszy).
  useEffect(() => {
    if (!open) {
      setActive(null)
      return
    }
    if (active === null && newestWithEntries) {
      setActive(newestWithEntries)
    }
  }, [open, newestWithEntries, active])

  const scrollerRef = useRef<HTMLDivElement>(null)
  const dayRefs = useRef<Record<string, HTMLButtonElement | null>>({})
  const snapTimerRef = useRef<number | null>(null)
  // Drag-to-scroll dla myszy (mobile ma natywny touch-scroll).
  const dragRef = useRef<{ down: boolean; startX: number; startScroll: number; moved: boolean }>({
    down: false,
    startX: 0,
    startScroll: 0,
    moved: false,
  })

  /**
   * Wyśrodkowuje wskazany dzień w karuzeli przez bezpośrednią manipulację
   * `scrollLeft` (nie używamy `scrollIntoView` — ono potrafi przewinąć też
   * zewnętrzne kontenery, co prowadzi do tego że cały chat sheet wyjeżdża
   * poza viewport).
   */
  function centerDay(date: string, smooth: boolean) {
    const scroller = scrollerRef.current
    const node = dayRefs.current[date]
    if (!scroller || !node) return
    const target =
      node.offsetLeft - scroller.clientWidth / 2 + node.clientWidth / 2
    scroller.scrollTo({ left: target, behavior: smooth ? 'smooth' : 'auto' })
  }

  // Po pierwszym ustawieniu aktywnego dnia (sync z newest-with-entries) —
  // natychmiastowy scroll do środka. selectDay/snap same robią centerDay
  // smooth i zaznaczają to przez `skipNextCenterRef`, żeby ten efekt nie
  // anulował ich animacji.
  const skipNextCenterRef = useRef(false)
  useEffect(() => {
    if (!open || !active) return
    if (skipNextCenterRef.current) {
      skipNextCenterRef.current = false
      return
    }
    const id = window.requestAnimationFrame(() => centerDay(active, false))
    return () => window.cancelAnimationFrame(id)
  }, [open, active])

  /** Po scrollu — znajdź dzień najbliżej środka; jeśli pusty, snap-uj do najbliższego z wpisem. */
  function handleScroll() {
    if (snapTimerRef.current) window.clearTimeout(snapTimerRef.current)
    snapTimerRef.current = window.setTimeout(() => {
      // Dopóki nie wiemy jaki ma być aktywny dzień (brak wpisów / przed sync)
      // — nie kombinujmy z setActive, żeby nie przeskoczyć na sąsiada.
      if (active === null || daysWithEntries.size === 0) return
      const scroller = scrollerRef.current
      if (!scroller) return
      const center = scroller.scrollLeft + scroller.clientWidth / 2

      let nearest: { date: string; dist: number } | null = null
      for (const date of days) {
        const node = dayRefs.current[date]
        if (!node) continue
        const c = node.offsetLeft + node.clientWidth / 2
        const dist = Math.abs(c - center)
        if (!nearest || dist < nearest.dist) nearest = { date, dist }
      }
      if (!nearest) return

      let target = nearest.date
      if (!daysWithEntries.has(target)) {
        const idx = days.indexOf(target)
        let best: { date: string; gap: number } | null = null
        for (let i = 0; i < days.length; i++) {
          if (!daysWithEntries.has(days[i])) continue
          const gap = Math.abs(i - idx)
          if (!best || gap < best.gap) best = { date: days[i], gap }
        }
        if (best) target = best.date
      }

      // KLUCZOWE: snap-scroll robimy TYLKO gdy zmienia się aktywny dzień.
      // Inaczej wpadamy w pętlę scroll → handleScroll → scroll.
      if (target !== active) {
        skipNextCenterRef.current = true
        setActive(target)
        centerDay(target, true)
      }
    }, 140)
  }

  function selectDay(date: string) {
    if (!daysWithEntries.has(date)) return
    if (date !== active) {
      skipNextCenterRef.current = true
      setActive(date)
      centerDay(date, true)
    }
  }

  // Dopóki nie znamy najnowszego dnia z wpisami, pokazujemy nagłówek bieżącego
  // miesiąca (dzisiaj) i pustą listę — UI nie miga, a loading state powyżej
  // poinformuje że dane się ładują.
  const fallbackDate = days[days.length - 1] ?? new Date().toISOString().slice(0, 10)
  const displayDate = active ?? fallbackDate
  const activeEntries = active ? grouped[active] ?? [] : []
  const activeDateObj = new Date(displayDate + 'T00:00:00')
  const monthLabel = `${PL_MONTHS[activeDateObj.getMonth()]} ${activeDateObj.getFullYear()}`

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="journal"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: reduce ? 0 : 0.22, ease: [0.32, 0.72, 0, 1] }}
          className="absolute inset-0 z-[30] flex flex-col bg-bg-base"
        >
          {/* Header dzienniczka */}
          <div className="flex items-center justify-between px-5 pt-3 pb-2">
            <button
              onClick={onClose}
              className="flex h-[34px] items-center gap-1.5 rounded-full border border-hairline pl-2 pr-3 text-ink-secondary transition-colors hover:border-ink-tertiary"
              aria-label="Wróć do czatu"
            >
              <svg viewBox="0 0 24 24" className="h-[16px] w-[16px]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              <span className="text-[13px]">Czat</span>
            </button>
            <div className="text-center">
              <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">
                Dzienniczek
              </div>
              <div className="font-serif text-[18px] leading-tight text-ink-primary">
                {monthLabel}
              </div>
            </div>
            <div className="h-[34px] w-[64px]" aria-hidden />
          </div>

          {/* Kalendarz karuzelowy */}
          <div className="border-b border-hairline pb-3">
            <div
              ref={scrollerRef}
              onScroll={handleScroll}
              onMouseDown={(e) => {
                const el = scrollerRef.current
                if (!el) return
                dragRef.current = {
                  down: true,
                  startX: e.clientX,
                  startScroll: el.scrollLeft,
                  moved: false,
                }
                el.style.cursor = 'grabbing'
              }}
              onMouseMove={(e) => {
                if (!dragRef.current.down) return
                const el = scrollerRef.current
                if (!el) return
                const dx = e.clientX - dragRef.current.startX
                if (Math.abs(dx) > 4) dragRef.current.moved = true
                el.scrollLeft = dragRef.current.startScroll - dx
              }}
              onMouseUp={() => {
                dragRef.current.down = false
                if (scrollerRef.current) scrollerRef.current.style.cursor = 'grab'
              }}
              onMouseLeave={() => {
                if (!dragRef.current.down) return
                dragRef.current.down = false
                if (scrollerRef.current) scrollerRef.current.style.cursor = 'grab'
              }}
              onClickCapture={(e) => {
                // Zjedz click jeśli to było przeciąganie a nie tap.
                if (dragRef.current.moved) {
                  e.preventDefault()
                  e.stopPropagation()
                  dragRef.current.moved = false
                }
              }}
              className="flex gap-2 overflow-x-auto px-5 pt-1 pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden cursor-grab select-none"
              style={{ scrollSnapType: 'x mandatory', touchAction: 'pan-x' }}
            >
              {days.map((date) => {
                const d = new Date(date + 'T00:00:00')
                const has = daysWithEntries.has(date)
                const isActive = date === active
                return (
                  <button
                    key={date}
                    ref={(el) => {
                      dayRefs.current[date] = el
                    }}
                    onClick={() => selectDay(date)}
                    disabled={!has}
                    aria-pressed={isActive}
                    aria-label={`${d.getDate()} ${PL_MONTHS[d.getMonth()]}${has ? '' : ' (brak wpisów)'}`}
                    className={[
                      'flex h-[64px] min-w-[52px] flex-shrink-0 flex-col items-center justify-center rounded-2xl border transition-all',
                      isActive
                        ? 'border-accent bg-accent text-bg-base shadow-[0_6px_20px_-8px_rgba(31,61,51,0.5)]'
                        : has
                          ? 'border-hairline bg-bg-card text-ink-primary hover:border-ink-tertiary'
                          : 'border-transparent bg-transparent text-ink-tertiary',
                      !has && 'opacity-40 cursor-not-allowed',
                    ].join(' ')}
                    style={{ scrollSnapAlign: 'center' }}
                  >
                    <span
                      className={[
                        'font-mono text-[9px] uppercase tracking-[0.14em]',
                        isActive ? 'text-bg-base/80' : 'text-ink-tertiary',
                      ].join(' ')}
                    >
                      {PL_WEEKDAYS[d.getDay()]}
                    </span>
                    <span className="font-serif text-[22px] leading-none mt-1">
                      {d.getDate()}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Lista kart */}
          <div className="flex-1 overflow-y-auto px-5 pt-4 pb-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={active ?? 'loading'}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: reduce ? 0 : 0.18, ease: [0.32, 0.72, 0, 1] }}
                className="space-y-3"
              >
                {loading ? (
                  <LoadingState />
                ) : entries.length === 0 ? (
                  <FirstTimeState />
                ) : activeEntries.length === 0 ? (
                  <EmptyState />
                ) : (
                  activeEntries.map((e) => <EntryCard key={e.id} entry={e} />)
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function EntryCard({ entry }: { entry: JournalEntry }) {
  const meta = CATEGORY_META[entry.category]
  return (
    <article
      className="rounded-2xl border border-hairline bg-bg-card p-4"
      style={{ boxShadow: '0 2px 8px -4px rgba(13,31,26,0.06)' }}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">
          {entry.startTime} — {entry.endTime}
        </span>
        <span
          className={`rounded-pill px-2.5 py-[3px] font-mono text-[9px] uppercase tracking-[0.12em] ${meta.pillClass}`}
        >
          {meta.label}
        </span>
      </div>
      <h3 className="mt-3 font-serif text-[18px] leading-snug text-ink-primary">
        {entry.title}
      </h3>
      <p className="mt-2 text-[13.5px] leading-[1.55] text-ink-secondary">
        {entry.summary}
      </p>
    </article>
  )
}

function LoadingState() {
  return (
    <div className="mt-10 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">
      Wczytuję dzienniczek…
    </div>
  )
}

function FirstTimeState() {
  return (
    <div className="mt-10 flex flex-col items-center text-center">
      <div className="font-serif text-[18px] text-ink-primary">
        Dzienniczek jest jeszcze pusty
      </div>
      <p className="mt-2 max-w-[260px] text-[13px] leading-[1.5] text-ink-secondary">
        Po pierwszej dłuższej rozmowie z Subskrypcikiem zapiszę tu krótkie podsumowanie — datę, kategorię i wniosek z dyskusji.
      </p>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="mt-10 flex flex-col items-center text-center">
      <div className="font-serif text-[18px] text-ink-primary">
        Brak rozmów tego dnia
      </div>
      <p className="mt-2 max-w-[240px] text-[13px] leading-[1.5] text-ink-secondary">
        Wybierz inny dzień z karuzeli powyżej — kalendarz pominie dni puste automatycznie.
      </p>
    </div>
  )
}
