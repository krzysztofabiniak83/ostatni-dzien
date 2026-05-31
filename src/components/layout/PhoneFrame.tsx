import type { ReactNode } from 'react'

interface PhoneFrameProps {
  children: ReactNode
  label?: string
  caption?: ReactNode
}

/**
 * Ramka telefonu 390×844 z notchem — scena prezentacyjna jak w prototypach HTML.
 * Ekran (.screen) jest kontenerem flex-column dla zawartości aplikacji.
 */
export function PhoneFrame({ children, label, caption }: PhoneFrameProps) {
  return (
    <div className="flex min-h-screen items-start justify-center px-5 pb-[60px] pt-10">
      <div className="flex flex-col items-center gap-6">
        {label && (
          <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-secondary opacity-70">
            {label}
          </div>
        )}

        <div
          className="relative h-[844px] w-[390px] rounded-[56px] bg-ink-primary p-3"
          style={{
            boxShadow:
              '0 50px 100px -20px rgba(13,31,26,0.25), 0 30px 60px -30px rgba(13,31,26,0.3), inset 0 0 0 2px rgba(255,255,255,0.04)',
          }}
        >
          {/* Notch */}
          <div className="absolute left-1/2 top-3 z-[100] h-8 w-[120px] -translate-x-1/2 rounded-[20px] bg-ink-primary" />

          <div className="screen relative flex h-full w-full flex-col overflow-hidden rounded-[44px] bg-bg-base">
            {children}
          </div>
        </div>

        {caption && (
          <div className="max-w-[390px] text-center text-[13px] leading-relaxed text-ink-secondary opacity-80">
            {caption}
          </div>
        )}
      </div>
    </div>
  )
}
