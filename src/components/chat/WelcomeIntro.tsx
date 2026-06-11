import { useReducedMotion } from 'framer-motion'
import { siNetflix, siSpotify, siApple, siNotion, siYoutube, siAudible, siDuolingo, siFigma } from 'simple-icons'

/**
 * Powitalny ekran Subskrypcika — empty state w ChatSheet zanim padnie pierwsze pytanie.
 *
 * - Środek: okrągły awatar (editorial, calm) z monogramem "S" w Fraunces.
 * - Tło: 3 orbity z logotypami popularnych usług, każda kręci się w innym tempie
 *   i kierunku. Logo siedzą na orbicie — gdy orbita obraca się o X°, logo
 *   obraca się o -X°, dzięki czemu logotypy NIE są "do góry nogami".
 * - prefers-reduced-motion: animacje wyłączone w globals.css przez @media.
 */

type Brand = {
  icon: { path: string }
  bg: string
  fg: string
  /** kółko białe → ciemna ikona, ciemne → jasna */
  variant?: 'fill' | 'mono'
}

const BRANDS: Brand[] = [
  { icon: siNetflix, bg: '#E50914', fg: '#fff' },
  { icon: siSpotify, bg: '#1DB954', fg: '#fff' },
  { icon: siApple, bg: '#0D1F1A', fg: '#fff' },
  { icon: siNotion, bg: '#FFFFFF', fg: '#0D1F1A' },
  { icon: siYoutube, bg: '#FF0000', fg: '#fff' },
  { icon: siAudible, bg: '#F8991C', fg: '#fff' },
  { icon: siDuolingo, bg: '#58CC02', fg: '#fff' },
  { icon: siFigma, bg: '#FFFFFF', fg: '#0D1F1A' },
]

function BrandChip({ brand, size = 40 }: { brand: Brand; size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-full border border-hairline shadow-sm"
      style={{
        width: size,
        height: size,
        background: brand.bg,
      }}
    >
      <svg viewBox="0 0 24 24" width={size * 0.5} height={size * 0.5} fill={brand.fg}>
        <path d={brand.icon.path} />
      </svg>
    </div>
  )
}

/**
 * Jedno logo na orbicie. `angle` = kąt startowy (deg). Orbit obraca się w rodzicu
 * (animacja CSS na div.orbit), logo kontruje obrót tak, by stało prosto.
 */
function OrbitItem({
  angle,
  radius,
  brand,
  size,
  counterAnimation,
}: {
  angle: number
  radius: number
  brand: Brand
  size: number
  /** Nazwa keyframe kontrującej obrót — żeby logo nie stało na głowie. */
  counterAnimation: string
}) {
  return (
    <div
      className="absolute left-1/2 top-1/2"
      style={{
        transform: `rotate(${angle}deg) translateX(${radius}px)`,
        transformOrigin: '0 0',
      }}
    >
      <div
        style={{
          transform: `translate(-50%, -50%) rotate(${-angle}deg)`,
          animation: `${counterAnimation} linear infinite`,
        }}
      >
        <BrandChip brand={brand} size={size} />
      </div>
    </div>
  )
}

export function WelcomeIntro() {
  const reduce = useReducedMotion()

  // 3 orbity — różne promienie i tempa.
  // Reduce-motion: brak animacji, statyczne pozycje.
  const orbits = [
    {
      radius: 92,
      duration: 38,
      reverse: false,
      counter: 'orbit-counter-1',
      items: [BRANDS[0], BRANDS[1], BRANDS[2]], // Netflix, Spotify, Apple
      size: 32,
    },
    {
      radius: 138,
      duration: 56,
      reverse: true,
      counter: 'orbit-counter-2',
      items: [BRANDS[3], BRANDS[4], BRANDS[5]], // Notion, YouTube, Audible
      size: 36,
    },
    {
      radius: 184,
      duration: 80,
      reverse: false,
      counter: 'orbit-counter-3',
      items: [BRANDS[6], BRANDS[7]], // Duolingo, Figma
      size: 30,
    },
  ]

  return (
    <div className="relative flex h-full flex-col items-center justify-center px-6 text-center">
      {/* Orbity w tle — absolute, wycentrowane na avatara */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
        <div className="relative">
          {orbits.map((o, oi) => (
            <div
              key={oi}
              className="absolute left-1/2 top-1/2"
              style={{
                width: 0,
                height: 0,
                animation: reduce
                  ? undefined
                  : `${o.reverse ? 'orbit-rotate-reverse' : 'orbit-rotate'} ${o.duration}s linear infinite`,
              }}
            >
              {/* Linia orbity — subtelna */}
              <div
                className="absolute rounded-full border border-hairline/60"
                style={{
                  width: o.radius * 2,
                  height: o.radius * 2,
                  left: -o.radius,
                  top: -o.radius,
                  opacity: 0.5,
                }}
              />
              {o.items.map((brand, i) => {
                const angleStep = 360 / o.items.length
                const angle = i * angleStep + oi * 30
                return (
                  <OrbitItem
                    key={i}
                    brand={brand}
                    radius={o.radius}
                    angle={angle}
                    size={o.size}
                    counterAnimation={`${o.counter} ${o.duration}s`}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Avatar Subskrypcika */}
      <div className="relative z-10 mb-5 flex h-[96px] w-[96px] items-center justify-center rounded-full bg-accent text-bg-base shadow-lg" style={{ boxShadow: '0 12px 32px -8px rgba(31,61,51,0.4)' }}>
        {/* Subtelny accent ring */}
        <div className="absolute inset-0 rounded-full border-2 border-accent-soft" style={{ transform: 'scale(1.12)', opacity: 0.6 }} />
        <span className="font-serif text-[52px] italic leading-none" style={{ marginTop: -4 }}>
          S
        </span>
      </div>

      {/* Tekst powitalny */}
      <div className="relative z-10 max-w-[280px]">
        <h2 className="mb-2 font-serif text-[28px] leading-tight text-ink-primary">
          Cześć, jestem <span className="italic text-accent">Subskrypcik</span>
        </h2>
        <p className="text-[14px] leading-[1.5] text-ink-secondary">
          Twój doradca subskrypcji. Pomogę Ci porównać plany, podpowiem jak anulować i wskażę gdzie tracisz pieniądze.
        </p>
        <p className="mt-3 text-[12px] text-ink-tertiary">
          Zacznij od jednego z pytań poniżej.
        </p>
      </div>
    </div>
  )
}
