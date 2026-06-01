import { useState, type ComponentType } from 'react'
import { motion, useReducedMotion, type PanInfo } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { StatusBar } from '../components/layout/StatusBar'
import {
  IllustrationFirst,
  IllustrationScan,
  IllustrationStop,
} from '../components/onboarding/illustrations'
import { useOnboarding } from '../store/onboarding'

interface Slide {
  illustration: ComponentType
  eyebrow: string
  title: React.ReactNode
  body: string
}

const SLIDES: Slide[] = [
  {
    illustration: IllustrationStop,
    eyebrow: 'Koniec niechcianych opłat',
    title: (
      <>
        Twoje pieniądze <em className="italic text-accent">zostają u Ciebie</em>
      </>
    ),
    body: 'Trial mija, subskrypcja się odnawia, a Ty dowiadujesz się z wyciągu. Już nie.',
  },
  {
    illustration: IllustrationScan,
    eyebrow: 'Wrzuć screenshot, my zrobimy resztę',
    title: (
      <>
        Bezbolesne <em className="italic text-accent">dodawanie</em>
      </>
    ),
    body: 'Wrzuć zdjęcie potwierdzenia z maila — wyciągniemy nazwę, kwotę i datę pobrania.',
  },
  {
    illustration: IllustrationFirst,
    eyebrow: 'Twoja pierwsza subskrypcja',
    title: (
      <>
        Dodaj <em className="italic text-accent">pierwszą</em> w 10 sekund
      </>
    ),
    body: 'Najlepiej zacząć od tej, która martwi Cię najbardziej.',
  },
]

const DRAG_SWITCH_PX = 60

export function Onboarding() {
  const [index, setIndex] = useState(0)
  const reduce = useReducedMotion()
  const navigate = useNavigate()
  const markDone = useOnboarding((s) => s.markDone)

  const isLast = index === SLIDES.length - 1

  const goNext = () => setIndex((i) => Math.min(i + 1, SLIDES.length - 1))
  const goPrev = () => setIndex((i) => Math.max(i - 1, 0))

  const finish = (openAdder: boolean) => {
    markDone()
    if (openAdder) {
      try {
        sessionStorage.setItem('open-adder-after-onboarding', '1')
      } catch {
        // ignore
      }
    }
    navigate('/', { replace: true })
  }

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -DRAG_SWITCH_PX) goNext()
    else if (info.offset.x > DRAG_SWITCH_PX) goPrev()
  }

  const Illustration = SLIDES[index].illustration

  return (
    <div className="relative flex h-full w-full flex-col bg-bg-base">
      <StatusBar />

      {/* Pasek górny: logo + pomiń */}
      <div className="flex items-center justify-between px-6 pb-4 pt-2">
        <div className="font-serif text-[18px] tracking-[-0.02em] text-ink-primary">
          Ostatni <em className="font-light italic text-accent">Dzień</em>
        </div>
        {!isLast && (
          <button
            onClick={() => finish(false)}
            className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary transition-colors hover:text-ink-primary"
          >
            Pomiń
          </button>
        )}
      </div>

      {/* Slajd — illustration + tekst, drag w poziomie */}
      <motion.div
        className="flex flex-1 flex-col items-center px-7 pb-4 pt-2"
        key={index}
        initial={reduce ? false : { opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: reduce ? 0 : 0.4, ease: [0.32, 0.72, 0, 1] }}
        drag={reduce ? false : 'x'}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-1 items-center justify-center">
          <Illustration />
        </div>

        <div className="mt-2 w-full text-center">
          <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">
            {SLIDES[index].eyebrow}
          </div>
          <h1 className="mb-3 font-serif text-[34px] font-light leading-[1.05] tracking-[-0.02em] text-ink-primary">
            {SLIDES[index].title}
          </h1>
          <p className="mx-auto max-w-[300px] text-[14px] leading-relaxed text-ink-secondary">
            {SLIDES[index].body}
          </p>
        </div>
      </motion.div>

      {/* Dots nav */}
      <div className="flex items-center justify-center gap-2 py-3">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            aria-label={`Slajd ${i + 1}`}
            onClick={() => setIndex(i)}
            className={clsx(
              'h-[6px] rounded-pill transition-all duration-300',
              i === index ? 'w-6 bg-accent' : 'w-[6px] bg-hairline',
            )}
          />
        ))}
      </div>

      {/* CTA */}
      <div className="flex flex-col gap-2 px-6 pb-8 pt-2">
        {isLast ? (
          <>
            <button
              onClick={() => finish(true)}
              className="rounded-[14px] bg-accent px-5 py-[17px] text-[15px] font-medium text-bg-base transition-all hover:bg-accent-hover active:scale-[0.98]"
            >
              Dodaj pierwszą subskrypcję
            </button>
            <button
              onClick={() => finish(false)}
              className="p-3 text-[14px] text-ink-secondary transition-colors hover:text-ink-primary"
            >
              Zobacz przykładowe
            </button>
          </>
        ) : (
          <button
            onClick={goNext}
            className="rounded-[14px] bg-accent px-5 py-[17px] text-[15px] font-medium text-bg-base transition-all hover:bg-accent-hover active:scale-[0.98]"
          >
            Dalej
          </button>
        )}
      </div>
    </div>
  )
}
