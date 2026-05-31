import clsx from 'clsx'

interface SubLogoProps {
  logoClass: string
  logoText: string
  /** 'sm' = kafelek na karcie (40px), 'lg' = hero ekranu akcji (72px). */
  size?: 'sm' | 'lg'
}

/** Kolory i font marek — przepisane z prototypu (sekcja .sub-logo.*). */
const LOGO_STYLES: Record<string, { bg: string; font: 'sans' | 'serif'; weight: string }> = {
  netflix: { bg: '#E50914', font: 'sans', weight: 'font-bold' },
  spotify: { bg: '#1DB954', font: 'sans', weight: 'font-bold' },
  adobe: { bg: '#FA0F00', font: 'sans', weight: 'font-bold' },
  notion: { bg: '#0D1F1A', font: 'sans', weight: 'font-semibold' },
  apple: { bg: '#0D1F1A', font: 'sans', weight: 'font-normal' },
  canva: { bg: '#00C4CC', font: 'sans', weight: 'font-bold' },
  disney: { bg: '#113CCF', font: 'serif', weight: 'font-normal' },
  linkedin: { bg: '#0A66C2', font: 'sans', weight: 'font-bold' },
}

const APPLE_PATH =
  'M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z'

export function SubLogo({ logoClass, logoText, size = 'sm' }: SubLogoProps) {
  const style = LOGO_STYLES[logoClass] ?? {
    bg: '#EDEAE3',
    font: 'serif' as const,
    weight: 'font-normal',
  }
  const isLg = size === 'lg'

  return (
    <div
      className={clsx(
        'flex flex-shrink-0 items-center justify-center text-white',
        isLg
          ? 'mx-auto mb-5 h-[72px] w-[72px] rounded-[20px] text-[32px] shadow-[0_8px_24px_-8px_rgba(13,31,26,0.15)]'
          : 'h-10 w-10 rounded-[11px] text-[19px]',
        style.font === 'serif' ? 'font-serif' : 'font-sans',
        style.weight,
      )}
      style={{ backgroundColor: style.bg }}
    >
      {logoClass === 'apple' ? (
        <svg
          width={isLg ? 36 : 20}
          height={isLg ? 36 : 20}
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d={APPLE_PATH} />
        </svg>
      ) : (
        logoText
      )}
    </div>
  )
}
