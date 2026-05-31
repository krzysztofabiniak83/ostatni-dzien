import clsx from 'clsx'
import { siApple, siIcloud, siNetflix, siNotion, siSpotify } from 'simple-icons'

interface SubLogoProps {
  logoClass: string
  logoText: string
  /** 'sm' = kafelek na karcie (40px), 'lg' = hero ekranu akcji (72px). */
  size?: 'sm' | 'lg'
}

type BrandIcon = { path: string }

/**
 * Konfiguracja per marka. Dla brandów obecnych w simple-icons (Netflix, Spotify,
 * Notion, Apple/iCloud) renderujemy autentyczny wektor SVG. Pozostałe (Adobe,
 * Canva, Disney+, LinkedIn) zostały usunięte z simple-icons na wniosek właścicieli
 * znaku — używamy więc typograficznego wordmarku na kolorze marki.
 */
type Style = {
  bg: string
  fg: string
  /** Jeśli podany — używamy autentycznego logo z simple-icons. */
  icon?: BrandIcon
  /** Dla wordmarków: font Geist sans (true) lub Fraunces serif (false). */
  sans?: boolean
  weight?: string
  /** Override rozmiaru tekstu dla wordmarku (sm). */
  sizeOverride?: { sm?: string; lg?: string }
}

const STYLES: Record<string, Style> = {
  netflix: { bg: '#E50914', fg: '#fff', icon: siNetflix },
  spotify: { bg: '#1DB954', fg: '#fff', icon: siSpotify },
  notion: { bg: '#FFFFFF', fg: '#0D1F1A', icon: siNotion },
  apple: { bg: '#0D1F1A', fg: '#fff', icon: siApple },
  icloud: { bg: '#FFFFFF', fg: '#0D1F1A', icon: siIcloud },

  // Wordmarki — brandy spoza simple-icons
  adobe: { bg: '#FA0F00', fg: '#fff', sans: true, weight: 'font-bold' },
  canva: { bg: '#00C4CC', fg: '#fff', sans: true, weight: 'font-bold' },
  disney: { bg: '#113CCF', fg: '#fff', sans: false, weight: 'font-normal' },
  linkedin: {
    bg: '#0A66C2',
    fg: '#fff',
    sans: true,
    weight: 'font-bold',
    sizeOverride: { sm: 'text-[15px]', lg: 'text-[26px]' },
  },
}

export function SubLogo({ logoClass, logoText, size = 'sm' }: SubLogoProps) {
  const style = STYLES[logoClass] ?? {
    bg: '#EDEAE3',
    fg: '#0D1F1A',
    sans: false,
    weight: 'font-normal',
  }
  const isLg = size === 'lg'
  // Rozmiar autentycznej ikony — nieco mniejszy niż kafelek dla padding optycznego.
  const iconSize = isLg ? 40 : 22
  const textSize = style.sizeOverride?.[size] ?? (isLg ? 'text-[32px]' : 'text-[19px]')

  return (
    <div
      className={clsx(
        'flex flex-shrink-0 items-center justify-center',
        isLg
          ? 'mx-auto mb-5 h-[72px] w-[72px] rounded-[20px] shadow-[0_8px_24px_-8px_rgba(13,31,26,0.15)]'
          : 'h-10 w-10 rounded-[11px]',
        !style.icon && (style.sans ? 'font-sans' : 'font-serif'),
        !style.icon && (style.weight ?? 'font-normal'),
        !style.icon && textSize,
      )}
      style={{
        backgroundColor: style.bg,
        color: style.fg,
        // Subtelny outline gdy tło jest białe (Notion / iCloud), żeby kafelek nie znikał na bg-card.
        boxShadow:
          style.bg === '#FFFFFF' && !isLg
            ? 'inset 0 0 0 1px rgba(13,31,26,0.08)'
            : undefined,
      }}
    >
      {style.icon ? (
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill={style.fg}
          aria-hidden="true"
        >
          <path d={style.icon.path} />
        </svg>
      ) : (
        logoText
      )}
    </div>
  )
}
