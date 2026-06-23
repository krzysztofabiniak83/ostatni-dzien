import { useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import clsx from 'clsx'
import { usePersonas, type PersonaPublic } from '../store/personas'
import { PersonaAvatar } from '../components/personas/PersonaAvatar'

function formatPrice(grosze: number): string {
  if (grosze <= 0) return 'darmowe'
  return `${(grosze / 100).toFixed(2).replace('.', ',')} zł`
}

/**
 * Sklep z personami. Pełna lista kart z opisem, ceną i CTA.
 * Po powrocie ze Stripe ze `?purchased=<id>` pokazuje toast i pingu-poll'uje
 * `load()` żeby złapać świeży entitlement gdy webhook się opóźni.
 */
export function Store() {
  const reduce = useReducedMotion()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { personas, owned, activePersonaId, load, setActive, buy, buying } = usePersonas()
  const [toast, setToast] = useState<string | null>(null)
  const pollRef = useRef<number | null>(null)

  // Obsługa redirect ze Stripe: ?purchased=<personaId>.
  useEffect(() => {
    const purchased = searchParams.get('purchased')
    if (!purchased) return

    let attempt = 0
    const tick = async () => {
      attempt += 1
      await load()
      const fresh = usePersonas.getState().owned
      if (fresh.has(purchased)) {
        const p = usePersonas.getState().personas.find((x) => x.id === purchased)
        setToast(`Odblokowano: ${p?.name ?? purchased}`)
        searchParams.delete('purchased')
        setSearchParams(searchParams, { replace: true })
        if (pollRef.current) window.clearTimeout(pollRef.current)
        return
      }
      if (attempt >= 4) {
        setToast('Płatność przyjęta. Aktywacja może chwilę potrwać.')
        searchParams.delete('purchased')
        setSearchParams(searchParams, { replace: true })
        return
      }
      pollRef.current = window.setTimeout(tick, 1500)
    }
    void tick()

    return () => {
      if (pollRef.current) window.clearTimeout(pollRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Auto-hide toastu.
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 3500)
    return () => window.clearTimeout(t)
  }, [toast])

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto bg-bg-base">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Wróć"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline text-ink-secondary transition-colors hover:border-ink-tertiary"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="text-center">
          <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">
            Marketplace
          </div>
          <div className="font-serif text-[20px] leading-tight text-ink-primary">Doradcy</div>
        </div>
        <div className="w-9" />
      </div>

      {/* Lista person */}
      <div className="flex flex-col gap-3 px-5 pb-8">
        {personas.map((p) => (
          <PersonaCard
            key={p.id}
            persona={p}
            isOwned={owned.has(p.id)}
            isActive={p.id === activePersonaId}
            isBuying={buying === p.id}
            onActivate={() => setActive(p.id)}
            onBuy={() => buy(p.id)}
          />
        ))}
      </div>

      {/* Toast */}
      {toast && (
        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="pointer-events-none fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 rounded-pill bg-ink-primary px-4 py-2 font-sans text-[13px] text-bg-base shadow-lg"
        >
          {toast}
        </motion.div>
      )}
    </div>
  )
}

interface CardProps {
  persona: PersonaPublic
  isOwned: boolean
  isActive: boolean
  isBuying: boolean
  onActivate: () => void
  onBuy: () => void
}

function PersonaCard({ persona, isOwned, isActive, isBuying, onActivate, onBuy }: CardProps) {
  return (
    <div
      className={clsx(
        'flex flex-col gap-3 rounded-lg border bg-bg-card p-4',
        isActive ? 'border-accent' : 'border-hairline',
      )}
    >
      <div className="flex items-start gap-3">
        <PersonaAvatar persona={persona} size={48} />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="font-serif text-[18px] leading-tight text-ink-primary">
              {persona.name}
            </div>
            {isActive && (
              <span className="rounded-pill bg-accent-soft px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-accent">
                Aktywny
              </span>
            )}
            {persona.is_free && (
              <span className="rounded-pill bg-bg-subtle px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-ink-secondary">
                Free
              </span>
            )}
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-tertiary">
            {persona.tagline}
          </div>
        </div>
        {!persona.is_free && !isOwned && (
          <div className="font-serif text-[16px] text-ink-primary">
            {formatPrice(persona.price_pln_grosze)}
          </div>
        )}
      </div>
      <p className="font-sans text-[14px] leading-relaxed text-ink-secondary">
        {persona.description}
      </p>
      <div className="pt-1">
        {isOwned ? (
          isActive ? (
            <button
              type="button"
              disabled
              className="w-full rounded-md border border-hairline px-4 py-2.5 font-sans text-[14px] font-medium text-ink-tertiary"
            >
              Aktywny
            </button>
          ) : (
            <button
              type="button"
              onClick={onActivate}
              className="w-full rounded-md bg-accent px-4 py-2.5 font-sans text-[14px] font-medium text-bg-base transition-colors hover:bg-accent-hover"
            >
              Aktywuj
            </button>
          )
        ) : (
          <button
            type="button"
            onClick={onBuy}
            disabled={isBuying}
            className="w-full rounded-md bg-alert px-4 py-2.5 font-sans text-[14px] font-medium text-white transition-all hover:brightness-95 disabled:opacity-60"
          >
            {isBuying ? 'Przekierowuję…' : `Kup · ${formatPrice(persona.price_pln_grosze)}`}
          </button>
        )}
      </div>
    </div>
  )
}
