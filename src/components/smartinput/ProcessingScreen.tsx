import { StatusBar } from '../layout/StatusBar'

interface ProcessingScreenProps {
  /** Realnie wrzucony obraz — skanujemy go zamiast atrapy paragonu. */
  imageUrl?: string | null
}

/** Ekran przetwarzania: skanowanie wrzuconego obrazu (lub atrapy) ze skanującą linią + glow. */
export function ProcessingScreen({ imageUrl }: ProcessingScreenProps) {
  return (
    <div className="relative flex h-full w-full flex-col bg-bg-base">
      <StatusBar />

      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-8 pb-20 text-center">
        {/* Skanowany screenshot — realny obraz usera albo atrapa paragonu */}
        <div className="scanning-glow relative h-[380px] w-[260px] overflow-hidden rounded-lg border border-hairline bg-bg-card shadow-[0_16px_40px_-12px_rgba(13,31,26,0.18),0_6px_16px_-6px_rgba(13,31,26,0.1)]">
          {imageUrl ? (
            <img src={imageUrl} alt="Wrzucony screenshot" className="h-full w-full object-cover" />
          ) : (
          <div className="flex h-full flex-col gap-[14px] p-5 px-5 py-6">
            <div className="flex items-center gap-2 border-b border-hairline pb-3">
              <div className="flex h-[26px] w-[26px] items-center justify-center rounded-[7px] bg-[#1DB954] text-[13px] font-bold text-white">
                S
              </div>
              <div className="text-[13px] font-semibold">Spotify Premium</div>
            </div>
            <div className="h-2 w-[55%] rounded bg-[#C5BDB0]" />
            <div className="h-2 rounded bg-bg-subtle" />
            <div className="h-2 w-[75%] rounded bg-bg-subtle" />
            <div className="mt-1 flex flex-col gap-2 rounded-md bg-bg-subtle p-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-ink-secondary">Total</span>
                <span className="font-serif text-[18px] font-medium">29,99 zł</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-ink-tertiary">Next billing</span>
                <span className="text-[11px]">06 Jun 2026</span>
              </div>
            </div>
            <div className="h-2 w-[55%] rounded bg-bg-subtle" />
            <div className="h-2 rounded bg-bg-subtle" />
          </div>
          )}
          <div className="scan-line" />
        </div>

        <div>
          <div className="mb-[6px] font-serif text-[24px] tracking-[-0.015em]">
            Analizuję <em className="italic text-accent">screenshot</em>
            <span className="processing-dots" />
          </div>
          <div className="text-[13px] text-ink-secondary">Wyciągamy nazwę, kwotę i datę pobrania</div>
        </div>
      </div>
    </div>
  )
}
