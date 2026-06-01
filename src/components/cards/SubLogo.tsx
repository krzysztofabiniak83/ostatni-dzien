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
  bg?: string
  /** CSS gradient — używany zamiast `bg` jeśli podany. */
  bgGradient?: string
  fg: string
  /** Jeśli podany — używamy autentycznego logo z simple-icons. */
  icon?: BrandIcon
  /** Surowy path SVG (viewBox 0 0 24 24) — własne logo (np. Adobe A). */
  customPath?: string
  /** Dla wordmarków: font Geist sans (true) lub Fraunces serif (false). */
  sans?: boolean
  weight?: string
  italic?: boolean
  /** Override rozmiaru tekstu dla wordmarku (sm/lg). */
  sizeOverride?: { sm?: string; lg?: string }
  /** Override tekstu wordmarku (zamiast `logoText` z propsów). */
  textOverride?: string
}

const STYLES: Record<string, Style> = {
  netflix: { bg: '#E50914', fg: '#fff', icon: siNetflix },
  spotify: { bg: '#1DB954', fg: '#fff', icon: siSpotify },
  notion: { bg: '#FFFFFF', fg: '#0D1F1A', icon: siNotion },
  apple: { bg: '#0D1F1A', fg: '#fff', icon: siApple },
  icloud: { bg: '#FFFFFF', fg: '#0D1F1A', icon: siIcloud },

  // Brandy spoza simple-icons — własne SVG / wordmarki na kolorach marki.
  // Adobe — chunky corporate "A" mark (bez crossbara, z trójkątnym wcięciem u góry).
  adobe: {
    bg: '#FA0F00',
    fg: '#fff',
    customPath: 'M2.5 21 L12 3 L21.5 21 L15.5 21 L12 14 L8.5 21 Z',
  },
  // Canva — gradient turkus→fiolet + italic "C" w Fraunces.
  canva: {
    bgGradient: 'linear-gradient(135deg, #00C4CC 0%, #7B61FF 100%)',
    fg: '#fff',
    italic: true,
    weight: 'font-normal',
    sizeOverride: { sm: 'text-[22px]', lg: 'text-[40px]' },
  },
  // Disney+ — gradient granat→błękit + italic "D+" w Fraunces.
  disney: {
    bgGradient: 'linear-gradient(180deg, #0D1B5A 0%, #1FA0DA 100%)',
    fg: '#fff',
    italic: true,
    weight: 'font-normal',
    textOverride: 'D+',
    sizeOverride: { sm: 'text-[16px]', lg: 'text-[28px]' },
  },
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
  // Rozmiar SVG — nieco mniejszy niż kafelek dla padding optycznego.
  const iconSize = isLg ? 40 : 22
  const customSize = isLg ? 44 : 24
  const textSize = style.sizeOverride?.[size] ?? (isLg ? 'text-[32px]' : 'text-[19px]')
  const isTextual = !style.icon && !style.customPath

  return (
    <div
      className={clsx(
        'flex flex-shrink-0 items-center justify-center',
        isLg
          ? 'mx-auto mb-5 h-[72px] w-[72px] rounded-[20px] shadow-[0_8px_24px_-8px_rgba(13,31,26,0.15)]'
          : 'h-10 w-10 rounded-[11px]',
        isTextual && (style.sans ? 'font-sans' : 'font-serif'),
        isTextual && (style.weight ?? 'font-normal'),
        isTextual && style.italic && 'italic',
        isTextual && textSize,
      )}
      style={{
        background: style.bgGradient ?? style.bg,
        color: style.fg,
        // Subtelny outline gdy tło jest białe (Notion / iCloud), żeby kafelek nie znikał na bg-card.
        boxShadow:
          style.bg === '#FFFFFF' && !isLg
            ? 'inset 0 0 0 1px rgba(13,31,26,0.08)'
            : undefined,
      }}
    >
      {style.icon ? (
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill={style.fg} aria-hidden="true">
          <path d={style.icon.path} />
        </svg>
      ) : style.customPath ? (
        <svg width={customSize} height={customSize} viewBox="0 0 24 24" fill={style.fg} aria-hidden="true">
          <path d={style.customPath} />
        </svg>
      ) : (
        style.textOverride ?? logoText
      )}
    </div>
  )
}
