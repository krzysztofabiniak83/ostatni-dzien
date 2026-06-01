import { siNetflix, siNotion, siSpotify } from 'simple-icons'

/**
 * Ilustracje 3 slajdów onboardingu — wszystkie w stylu calm/editorial,
 * z palety produktu (zieleń + terakota), bez fotografii i bez emoji.
 */

/** Slajd 1 — koniec niechcianych opłat: stos przekreślonych kwot ze szpilką "434,96 zł". */
export function IllustrationStop() {
  const items = [
    { label: 'Netflix Premium', amount: '67,00 zł' },
    { label: 'Spotify Family', amount: '29,99 zł' },
    { label: 'Notion AI', amount: '40,00 zł' },
  ]
  return (
    <div className="relative mx-auto flex h-[220px] w-[260px] flex-col items-center justify-center">
      {/* Tło — soft accent halo */}
      <div className="absolute inset-0 -z-0 rounded-[32px] bg-accent-soft/60 blur-[28px]" />

      <div className="relative z-10 flex w-full flex-col gap-2">
        {items.map((it, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-lg border border-hairline bg-bg-card px-4 py-[10px]"
            style={{
              transform: `rotate(${i === 1 ? 0 : i === 0 ? -1.5 : 1.5}deg)`,
            }}
          >
            <span className="text-[13px] font-medium text-ink-primary">{it.label}</span>
            <span className="relative text-[13px] text-ink-secondary">
              {it.amount}
              <span className="absolute left-[-2px] right-[-2px] top-1/2 h-px bg-alert" />
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Slajp 2 — wrzuć screenshot: kwadratowy paragon ze skanującą linią. */
export function IllustrationScan() {
  return (
    <div className="relative mx-auto flex h-[220px] w-[200px] items-center justify-center">
      <div className="absolute inset-0 -z-0 rounded-[32px] bg-accent-soft/50 blur-[24px]" />

      <div className="scanning-glow relative h-[200px] w-[150px] overflow-hidden rounded-lg border border-hairline bg-bg-card shadow-[0_10px_28px_-10px_rgba(13,31,26,0.18)]">
        <div className="flex h-full flex-col gap-3 p-4">
          <div className="flex items-center gap-2 border-b border-hairline pb-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#1DB954" aria-hidden="true">
              <path d={siSpotify.path} />
            </svg>
            <div className="text-[11px] font-semibold text-ink-primary">Spotify</div>
          </div>
          <div className="h-1.5 w-3/4 rounded bg-bg-subtle" />
          <div className="h-1.5 rounded bg-bg-subtle" />
          <div className="mt-1 flex flex-col gap-1.5 rounded-md bg-bg-subtle p-2">
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-ink-secondary">Total</span>
              <span className="font-serif text-[14px] font-medium">29,99 zł</span>
            </div>
          </div>
          <div className="h-1.5 w-1/2 rounded bg-bg-subtle" />
          <div className="h-1.5 w-2/3 rounded bg-bg-subtle" />
        </div>
        <div className="scan-line" />
      </div>
    </div>
  )
}

/** Slajd 3 — dodaj pierwszą: stos 3 mini-kart z kolorowymi logami. */
export function IllustrationFirst() {
  const cards = [
    { bg: '#E50914', path: siNetflix.path, name: 'Netflix Premium', days: '2 dni' },
    { bg: '#1DB954', path: siSpotify.path, name: 'Spotify Family', days: '6 dni' },
    { bg: '#FFFFFF', path: siNotion.path, name: 'Notion AI', days: '12 dni', dark: true },
  ]
  return (
    <div className="relative mx-auto flex h-[220px] w-[260px] items-center justify-center">
      <div className="absolute inset-0 -z-0 rounded-[32px] bg-accent-soft/60 blur-[28px]" />

      <div className="relative z-10 flex w-full flex-col gap-[6px]">
        {cards.map((c, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-lg border border-hairline bg-bg-card px-3 py-[10px]"
          >
            <div
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md"
              style={{
                backgroundColor: c.bg,
                boxShadow: c.bg === '#FFFFFF' ? 'inset 0 0 0 1px rgba(13,31,26,0.08)' : undefined,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill={c.dark ? '#0D1F1A' : '#fff'} aria-hidden="true">
                <path d={c.path} />
              </svg>
            </div>
            <div className="flex-1 text-[12px] font-medium text-ink-primary">{c.name}</div>
            <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-tertiary">
              {c.days}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
