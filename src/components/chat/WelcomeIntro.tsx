import { useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { siNetflix, siSpotify, siApple, siNotion, siYoutube, siAudible, siDuolingo, siFigma } from 'simple-icons'

/**
 * Powitalny ekran Subskrypcika — empty state w ChatSheet zanim padnie pierwsze pytanie.
 *
 * - Środek: awatar Subskrypcika (zdjęcie /subskrypcik-avatar.png z fallbackiem
 *   do italic "S" w Fraunces na zielonym tle).
 * - Tło: 2 orbity z logo popularnych usług, krążące blisko awatara (nie nachodzą
 *   na tekst poniżej). Logo: 50% opacity, kontr-obrót żeby stały prosto.
 * - prefers-reduced-motion: animacje wyłączone.
 */

type Brand = { icon: { path: string }; bg: string; fg: string }

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

function BrandChip({ brand, size }: { brand: Brand; size: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-full shadow-sm"
      style={{ width: size, height: size, background: brand.bg }}
    >
      <svg viewBox="0 0 24 24" width={size * 0.55} height={size * 0.55} fill={brand.fg}>
        <path d={brand.icon.path} />
      </svg>
    </div>
  )
}

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

const AVATAR_SIZE = 96

export function WelcomeIntro() {
  const reduce = useReducedMotion()
  const [imgFailed, setImgFailed] = useState(false)

  // 2 orbity — kompaktowe, mieszczą się w całości w sheet.
  // Avatar promień = 48. Orbity: 70 i 92 (mogą lekko nachodzić na tekst).
  const orbits = [
    {
      radius: 70,
      duration: 32,
      reverse: false,
      counter: 'orbit-counter-1',
      items: [BRANDS[0], BRANDS[1], BRANDS[2], BRANDS[3]],
      size: 24,
      startAngle: 30,
    },
    {
      radius: 92,
      duration: 50,
      reverse: true,
      counter: 'orbit-counter-2',
      items: [BRANDS[4], BRANDS[5], BRANDS[6], BRANDS[7]],
      size: 22,
      startAngle: 0,
    },
  ]

  return (
    <div className="relative flex h-full flex-col items-center justify-start overflow-x-hidden px-6 pt-4 text-center">
      {/* Sekcja z awatarem + orbitami — fixed height żeby orbity nie wlazły na tekst */}
      <div className="relative mb-3 flex items-center justify-center" style={{ height: 220, width: 240 }}>
        {/* Orbity w tle */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden style={{ opacity: 0.5 }}>
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
                {/* Subtelna linia orbity */}
                <div
                  className="absolute rounded-full border border-hairline"
                  style={{
                    width: o.radius * 2,
                    height: o.radius * 2,
                    left: -o.radius,
                    top: -o.radius,
                    opacity: 0.4,
                  }}
                />
                {o.items.map((brand, i) => {
                  const angleStep = 360 / o.items.length
                  const angle = i * angleStep + o.startAngle
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

        {/* Avatar Subskrypcika — obrazek z fallbackiem do "S" */}
        <div
          className="relative z-10 flex items-center justify-center overflow-hidden rounded-full bg-accent text-bg-base"
          style={{
            width: AVATAR_SIZE,
            height: AVATAR_SIZE,
            boxShadow: '0 16px 40px -10px rgba(31,61,51,0.4), 0 0 0 4px rgba(245,243,238,0.9)',
          }}
        >
          {!imgFailed ? (
            <img
              src="/subskrypcik-avatar.png"
              alt="Subskrypcik"
              className="h-full w-full object-cover"
              onError={() => setImgFailed(true)}
            />
          ) : (
            <span className="font-serif text-[60px] italic leading-none" style={{ marginTop: -4 }}>
              S
            </span>
          )}
        </div>
      </div>

      {/* Tekst powitalny */}
      <div className="relative z-10 max-w-[300px]">
        <h2 className="mb-2 font-serif text-[26px] leading-tight text-ink-primary">
          Cześć, jestem <span className="italic text-accent">Subskrypcik</span>
        </h2>
        <p className="text-[14px] leading-[1.5] text-ink-secondary">
          Twój doradca subskrypcji. Pomogę porównać plany, podpowiem jak anulować i wskażę gdzie tracisz pieniądze.
        </p>
        <p className="mt-3 text-[12px] text-ink-tertiary">
          Wybierz jedno z pytań poniżej albo zapytaj wprost.
        </p>
      </div>
    </div>
  )
}
