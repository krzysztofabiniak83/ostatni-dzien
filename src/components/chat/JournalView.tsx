import type React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  CATEGORY_META,
  MOCK_JOURNAL,
  groupByDate,
  type JournalEntry,
  type JournalPhoto,
} from '../../data/journal'
import { supabase } from '../../lib/supabase'
import { Toast } from '../ui/Toast'

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
 * Generuje listę dni od `oldestIso` do dziś (najstarsze pierwsze).
 * Liczymy bezpośrednio w UTC, żeby nie złapać duplikatu/luki przy DST.
 * Limit bezpieczeństwa: max 5 lat (≈1827 dni) — zapobiega obwisaniu DOM gdyby
 * w bazie znalazła się jakaś dziwna data.
 */
function buildDayWindow(oldestIso: string | null): string[] {
  const out: string[] = []
  const now = new Date()
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  const DAY = 86_400_000
  const fallbackDays = 60
  let totalDays = fallbackDays
  if (oldestIso) {
    const oldest = new Date(oldestIso + 'T00:00:00Z').getTime()
    const diff = Math.floor((todayUtc - oldest) / DAY)
    if (Number.isFinite(diff) && diff > 0) totalDays = Math.min(Math.max(diff, fallbackDays), 1827)
  }
  for (let i = totalDays; i >= 0; i--) {
    const iso = new Date(todayUtc - i * DAY).toISOString().slice(0, 10)
    out.push(iso)
  }
  return out
}

export function JournalView({
  open,
  onClose,
  onCloseSheet,
}: {
  open: boolean
  /** Zamyka tylko dzienniczek (powrót do czatu). */
  onClose: () => void
  /** Zamyka cały ChatSheet — używane przez iOS drag-handle u góry. */
  onCloseSheet: () => void
}) {
  const reduce = useReducedMotion()
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(false)
  const grouped = useMemo(() => groupByDate(entries), [entries])
  const daysWithEntries = useMemo(
    () => new Set(Object.keys(grouped)),
    [grouped],
  )
  const oldestEntryDate = useMemo(() => {
    let oldest: string | null = null
    for (const d of daysWithEntries) if (!oldest || d < oldest) oldest = d
    return oldest
  }, [daysWithEntries])
  const days = useMemo(() => buildDayWindow(oldestEntryDate), [oldestEntryDate])

  const [refreshTick, setRefreshTick] = useState(0)
  const refresh = () => setRefreshTick((n) => n + 1)

  const [toast, setToast] = useState<string | null>(null)
  const toastTimerRef = useRef<number | null>(null)
  const flashToast = (msg: string) => {
    setToast(msg)
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current)
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2200)
  }

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
                photos?: JournalPhoto[]
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
                photos: c.photos ?? [],
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
  }, [open, refreshTick])

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
  const [edges, setEdges] = useState<{ left: boolean; right: boolean }>({ left: false, right: true })

  /** Aktualizuje czy widać strzałki nawigacyjne kalendarza. */
  function updateEdges() {
    const el = scrollerRef.current
    if (!el) return
    const left = el.scrollLeft > 4
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 4
    setEdges((prev) => (prev.left === left && prev.right === right ? prev : { left, right }))
  }

  /** Przewija kalendarz o ~70% szerokości widoku w lewo/prawo. */
  function scrollByPage(dir: -1 | 1) {
    const el = scrollerRef.current
    if (!el) return
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.7), behavior: 'smooth' })
  }
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
    const id = window.requestAnimationFrame(() => {
      centerDay(active, false)
      updateEdges()
    })
    return () => window.cancelAnimationFrame(id)
  }, [open, active])

  // Recompute edges on resize, gdy dzienniczek otwarty.
  useEffect(() => {
    if (!open) return
    const onResize = () => updateEdges()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [open])

  /** Po scrollu — znajdź dzień najbliżej środka; jeśli pusty, snap-uj do najbliższego z wpisem. */
  function handleScroll() {
    updateEdges()
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
          className="absolute inset-0 z-[30] flex flex-col overflow-hidden rounded-t-[24px] bg-bg-base"
        >
          {/* iOS-style drag handle — zwija cały ChatSheet (jak na czacie). */}
          <div className="flex justify-center pt-3 pb-1">
            <button
              aria-label="Zamknij"
              onClick={onCloseSheet}
              className="h-[5px] w-[40px] rounded-full bg-hairline transition-colors hover:bg-ink-tertiary"
            />
          </div>

          {/* Header dzienniczka */}
          <div className="flex items-center justify-between px-5 pt-2 pb-2">
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
          <div className="relative border-b border-hairline pb-3">
            {/* Strzałka w lewo */}
            <button
              type="button"
              onClick={() => scrollByPage(-1)}
              disabled={!edges.left}
              aria-label="Wcześniejsze dni"
              className={[
                'absolute left-1 top-1/2 z-10 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full',
                'border border-hairline bg-bg-base/90 backdrop-blur text-ink-secondary shadow-sm transition-all',
                'hover:border-ink-tertiary hover:text-ink-primary',
                edges.left ? 'opacity-100' : 'pointer-events-none opacity-0',
              ].join(' ')}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            {/* Strzałka w prawo */}
            <button
              type="button"
              onClick={() => scrollByPage(1)}
              disabled={!edges.right}
              aria-label="Późniejsze dni"
              className={[
                'absolute right-1 top-1/2 z-10 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full',
                'border border-hairline bg-bg-base/90 backdrop-blur text-ink-secondary shadow-sm transition-all',
                'hover:border-ink-tertiary hover:text-ink-primary',
                edges.right ? 'opacity-100' : 'pointer-events-none opacity-0',
              ].join(' ')}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
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
                  activeEntries.map((e) => (
                    <EntryCard key={e.id} entry={e} onChanged={refresh} onToast={flashToast} />
                  ))
                )}
              </motion.div>
            </AnimatePresence>
          </div>
          <Toast message={toast} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

const MAX_PHOTOS = 6
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']

/** Wpis dzienniczka zapisany w Supabase ma id w formacie UUID. Mocki używają 'j-...'. */
function isRealEntry(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-/.test(id)
}

function EntryCard({
  entry,
  onChanged,
  onToast,
}: {
  entry: JournalEntry
  onChanged: () => void
  onToast: (msg: string) => void
}) {
  const meta = CATEGORY_META[entry.category]
  const photos = entry.photos ?? []
  const canEdit = isRealEntry(entry.id)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setError(null)
    const remaining = MAX_PHOTOS - photos.length
    const arr = Array.from(files).slice(0, remaining)
    if (arr.length === 0) {
      setError(`Max ${MAX_PHOTOS} zdjęć na wpis.`)
      return
    }
    setBusy(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) throw new Error('Brak sesji.')
      const { data: userData } = await supabase.auth.getUser()
      const userId = userData.user?.id
      if (!userId) throw new Error('Brak usera.')

      for (const file of arr) {
        if (!ALLOWED_MIME.includes(file.type)) {
          throw new Error(`Nieobsługiwany typ: ${file.type || 'unknown'}`)
        }
        if (file.size > 10 * 1024 * 1024) {
          throw new Error('Plik większy niż 10 MB.')
        }
        const photoId = (crypto as Crypto & { randomUUID(): string }).randomUUID()
        const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
        const path = `${userId}/${entry.id}/${photoId}.${ext}`
        const up = await supabase.storage.from('journal-photos').upload(path, file, {
          contentType: file.type,
          upsert: false,
        })
        if (up.error) throw new Error(up.error.message)
        const res = await fetch('/api/journal-photos', {
          method: 'POST',
          headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            conversationId: entry.id,
            storagePath: path,
            mimeType: file.type,
            sizeBytes: file.size,
            originalName: file.name,
          }),
        })
        if (!res.ok) {
          await supabase.storage.from('journal-photos').remove([path])
          const j = (await res.json().catch(() => ({}))) as { message?: string }
          throw new Error(j.message || 'Zapis metadanych nie powiódł się.')
        }
      }
      onChanged()
      onToast(arr.length === 1 ? 'Dodano zdjęcie' : `Dodano ${arr.length} zdjęcia`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd uploadu.')
    } finally {
      setBusy(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleDelete(photo: JournalPhoto) {
    setError(null)
    setBusy(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) throw new Error('Brak sesji.')
      const res = await fetch(`/api/journal-photos?id=${encodeURIComponent(photo.id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { message?: string }
        throw new Error(j.message || 'Usuwanie nie powiodło się.')
      }
      onChanged()
      onToast('Usunięto zdjęcie')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd usuwania.')
    } finally {
      setBusy(false)
    }
  }

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

      {photos.length > 0 && (
        <div className="mt-3">
          <PhotoGallery
            photos={photos}
            onOpen={(i) => setLightboxIdx(i)}
            onDelete={canEdit ? handleDelete : undefined}
            busy={busy}
          />
        </div>
      )}

      <h3 className="mt-3 font-serif text-[18px] leading-snug text-ink-primary">
        {entry.title}
      </h3>
      <p className="mt-2 text-[13.5px] leading-[1.55] text-ink-secondary">
        {entry.summary}
      </p>

      {canEdit && (
        <div className="mt-4">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy || photos.length >= MAX_PHOTOS}
            className="flex h-[44px] w-full items-center justify-center gap-2 rounded-md border border-dashed border-hairline bg-bg-subtle/40 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-secondary transition-colors hover:border-ink-tertiary hover:text-ink-primary disabled:opacity-40"
            aria-label="Dodaj zdjęcie do podsumowania"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            {busy
              ? 'Wgrywam…'
              : photos.length >= MAX_PHOTOS
                ? `Limit ${MAX_PHOTOS} zdjęć`
                : `Dodaj zdjęcie do podsumowania (${photos.length}/${MAX_PHOTOS})`}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            multiple
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />
        </div>
      )}
      {error && (
        <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.14em] text-alert">
          {error}
        </div>
      )}

      {lightboxIdx !== null && (
        <Lightbox
          photos={photos}
          startIndex={lightboxIdx}
          canDelete={canEdit}
          onClose={() => setLightboxIdx(null)}
          onDelete={handleDelete}
        />
      )}
    </article>
  )
}

function PhotoGallery({
  photos,
  onOpen,
  onDelete,
  busy,
}: {
  photos: JournalPhoto[]
  onOpen: (idx: number) => void
  onDelete?: (p: JournalPhoto) => Promise<void>
  busy?: boolean
}) {
  const n = photos.length

  function Thumb({ p, idx, aspect, overlay }: { p: JournalPhoto; idx: number; aspect: string; overlay?: React.ReactNode }) {
    return (
      <div className="relative" style={{ aspectRatio: aspect }}>
        <button
          type="button"
          onClick={() => onOpen(idx)}
          className="block h-full w-full overflow-hidden rounded-sm bg-bg-subtle"
        >
          {p.signedUrl && <img src={p.signedUrl} alt="" loading="lazy" className="h-full w-full object-cover" />}
          {overlay}
        </button>
        {onDelete && (
          <button
            type="button"
            onClick={async (e) => {
              e.stopPropagation()
              if (busy) return
              await onDelete(p)
            }}
            disabled={busy}
            aria-label="Usuń zdjęcie"
            className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-ink-primary/70 text-bg-base backdrop-blur-sm transition-all hover:bg-ink-primary disabled:opacity-40"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </button>
        )}
      </div>
    )
  }

  if (n === 1) return <Thumb p={photos[0]} idx={0} aspect="4 / 3" />

  if (n === 2 || n === 3) {
    return (
      <div className={`grid gap-2 ${n === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
        {photos.map((p, i) => <Thumb key={p.id} p={p} idx={i} aspect="1 / 1" />)}
      </div>
    )
  }

  // 4+ → grid 2x2, 4. kafelek z overlay +N (przy >4)
  const visible = photos.slice(0, 4)
  const extra = n - 4
  return (
    <div className="grid grid-cols-2 gap-2">
      {visible.map((p, i) => (
        <Thumb
          key={p.id}
          p={p}
          idx={i}
          aspect="1 / 1"
          overlay={i === 3 && extra > 0 ? (
            <div className="absolute inset-0 flex items-center justify-center bg-ink-primary/55 font-serif text-[22px] text-bg-base">
              +{extra}
            </div>
          ) : undefined}
        />
      ))}
    </div>
  )
}

function Lightbox({
  photos,
  startIndex,
  canDelete,
  onClose,
  onDelete,
}: {
  photos: JournalPhoto[]
  startIndex: number
  canDelete: boolean
  onClose: () => void
  onDelete: (p: JournalPhoto) => Promise<void>
}) {
  const [idx, setIdx] = useState(startIndex)
  const safeIdx = Math.min(idx, photos.length - 1)
  const photo = photos[safeIdx]

  useEffect(() => {
    if (photos.length === 0) onClose()
  }, [photos.length, onClose])

  if (!photo) return null

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-ink-primary/95" onClick={onClose}>
      <div className="flex items-center justify-between px-4 pt-4 text-bg-base" onClick={(e) => e.stopPropagation()}>
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] opacity-70">
          {safeIdx + 1} / {photos.length}
        </span>
        <div className="flex items-center gap-2">
          {canDelete && (
            <button
              type="button"
              onClick={async () => {
                await onDelete(photo)
              }}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-bg-base/30 hover:bg-bg-base/10"
              aria-label="Usuń zdjęcie"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-bg-base/30 hover:bg-bg-base/10"
            aria-label="Zamknij"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
        {photo.signedUrl && (
          <img src={photo.signedUrl} alt="" className="max-h-full max-w-full object-contain" />
        )}
      </div>
      {photos.length > 1 && (
        <div className="flex items-center justify-between px-4 pb-6" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setIdx((i) => (i - 1 + photos.length) % photos.length)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-bg-base/30 text-bg-base hover:bg-bg-base/10"
            aria-label="Poprzednie"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setIdx((i) => (i + 1) % photos.length)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-bg-base/30 text-bg-base hover:bg-bg-base/10"
            aria-label="Następne"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      )}
    </div>
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
