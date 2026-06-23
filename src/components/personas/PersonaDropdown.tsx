import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import clsx from 'clsx'
import { usePersonas, type PersonaPublic } from '../../store/personas'
import { PersonaAvatar } from './PersonaAvatar'

const EASE = [0.32, 0.72, 0, 1] as const

function formatPrice(grosze: number): string {
  if (grosze <= 0) return ''
  return `${(grosze / 100).toFixed(2).replace('.', ',')} zł`
}

/**
 * Dropdown w headerze ChatSheet — szybka zmiana aktywnej persony.
 * - Owned + active: wyróżniona, Check.
 * - Owned + inactive: klik = setActive.
 * - Not owned: opacity-50 + pill "Kup · X zł" (terracotta).
 * - Footer: link do /store.
 */
export function PersonaDropdown() {
  const reduce = useReducedMotion()
  const navigate = useNavigate()
  const { personas, owned, activePersonaId, setActive, buy, buying } = usePersonas()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  const active = personas.find((p) => p.id === activePersonaId)

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-start gap-2 text-left transition-opacity hover:opacity-80"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">
            Wybierz doradcę AI
          </div>
          <div className="flex items-center gap-1.5 font-serif text-[22px] leading-tight text-ink-primary">
            <span>{active?.name ?? 'Subskrypcik'}</span>
            <svg
              viewBox="0 0 24 24"
              className={clsx('h-4 w-4 text-ink-tertiary transition-transform', open && 'rotate-180')}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        </div>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: -4 }}
            transition={{ duration: reduce ? 0 : 0.18, ease: EASE }}
            className="absolute left-0 top-full z-[70] mt-2 w-[280px] origin-top-left rounded-xl border border-hairline bg-bg-card shadow-lg"
          >
            <ul className="py-1.5">
              {personas.map((p) => (
                <PersonaRow
                  key={p.id}
                  persona={p}
                  isOwned={owned.has(p.id)}
                  isActive={p.id === activePersonaId}
                  isBuying={buying === p.id}
                  onActivate={async () => {
                    await setActive(p.id)
                    setOpen(false)
                  }}
                  onBuy={() => buy(p.id)}
                />
              ))}
            </ul>
            <div className="border-t border-hairline px-3 py-2">
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  navigate('/store')
                }}
                className="flex w-full items-center justify-between rounded-md px-2 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-secondary hover:bg-bg-subtle"
              >
                Zobacz wszystkich
                <span>→</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface RowProps {
  persona: PersonaPublic
  isOwned: boolean
  isActive: boolean
  isBuying: boolean
  onActivate: () => void
  onBuy: () => void
}

function PersonaRow({ persona, isOwned, isActive, isBuying, onActivate, onBuy }: RowProps) {
  const canActivate = isOwned && !isActive

  return (
    <li>
      <div
        className={clsx(
          'flex items-center gap-3 px-3 py-2.5',
          isActive && 'bg-accent-soft',
          !isOwned && 'opacity-60',
        )}
      >
        <PersonaAvatar persona={persona} size={36} />
        <button
          type="button"
          disabled={!canActivate}
          onClick={canActivate ? onActivate : undefined}
          className={clsx(
            'flex flex-1 flex-col items-start text-left',
            canActivate && 'cursor-pointer',
          )}
        >
          <div className="flex items-center gap-1.5 font-sans text-[14px] font-medium text-ink-primary">
            {persona.name}
            {isActive && (
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-accent" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12l5 5 9-12" />
              </svg>
            )}
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-tertiary">
            {persona.tagline}
          </div>
        </button>
        {!isOwned && (
          <button
            type="button"
            onClick={onBuy}
            disabled={isBuying}
            className="flex flex-shrink-0 items-center rounded-pill bg-alert px-3 py-1.5 font-sans text-[12px] font-medium text-white transition-all hover:brightness-95 disabled:opacity-60"
          >
            {isBuying ? 'Przekierowuję…' : `Kup · ${formatPrice(persona.price_pln_grosze)}`}
          </button>
        )}
      </div>
    </li>
  )
}
