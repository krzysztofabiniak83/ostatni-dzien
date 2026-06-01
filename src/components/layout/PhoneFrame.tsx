import type { ReactNode } from 'react'

interface PhoneFrameProps {
  children: ReactNode
  label?: string
  caption?: ReactNode
}

/**
 * Layout aplikacji.
 *
 * - **Mobile (<md / <768px)**: full-screen, bez ramki, bez sceny, bez notcha.
 *   Apka zachowuje się jak natywna na telefonie (100dvh, edge-to-edge).
 * - **Tablet/desktop (≥md)**: scena prezentacyjna z ramką telefonu 390×844,
 *   notchem, labelem na górze i caption pod spodem — jak w prototypach HTML.
 */
export function PhoneFrame({ children, label, caption }: PhoneFrameProps) {
  return (
    <div className="flex min-h-[100dvh] flex-col md:min-h-screen md:items-start md:justify-center md:px-5 md:pb-[60px] md:pt-10">
      <div className="flex h-[100dvh] w-full flex-col md:h-auto md:items-center md:gap-6">
        {label && (
          <div className="hidden font-mono text-[11px] uppercase tracking-[0.12em] text-ink-secondary opacity-70 md:block">
            {label}
          </div>
        )}

        <div className="phone-shell relative flex h-full w-full flex-col bg-bg-base md:h-[844px] md:w-[390px] md:rounded-[56px] md:bg-ink-primary md:p-3">
          {/* Notch — tylko w trybie sceny */}
          <div className="pointer-events-none absolute left-1/2 top-3 z-[100] hidden h-8 w-[120px] -translate-x-1/2 rounded-[20px] bg-ink-primary md:block" />

          <div
            className="screen relative flex h-full w-full flex-col overflow-hidden bg-bg-base md:rounded-[44px]"
            style={{
              // Safe area dla notch / home indicator — tylko na mobile (na desktopie ramka i tak pokrywa).
              paddingTop: 'env(safe-area-inset-top)',
              paddingBottom: 'env(safe-area-inset-bottom)',
            }}
          >
            {children}
          </div>
        </div>

        {caption && (
          <div className="hidden max-w-[390px] text-center text-[13px] leading-relaxed text-ink-secondary opacity-80 md:block">
            {caption}
          </div>
        )}
      </div>
    </div>
  )
}
