import { useEffect, useState } from 'react'
import { AnimatePresence, motion, type PanInfo } from 'framer-motion'
import clsx from 'clsx'
import { Copy, KeyRound, Plus, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'

interface ApiTokensSheetProps {
  open: boolean
  onClose: () => void
}

type TokenRow = {
  id: string
  name: string
  token_prefix: string
  created_at: string
  last_used_at: string | null
  revoked_at: string | null
  expires_at: string | null
}

async function authedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Brak aktywnej sesji.')
  return fetch(path, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${token}`,
    },
  })
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('pl-PL', { dateStyle: 'medium', timeStyle: 'short' })
}

export function ApiTokensSheet({ open, onClose }: ApiTokensSheetProps) {
  const [tokens, setTokens] = useState<TokenRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(false)
  const [revealed, setRevealed] = useState<{ token: string; name: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await authedFetch('/api/tokens')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = (await res.json()) as { tokens: TokenRow[] }
      setTokens(json.tokens)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Błąd pobierania tokenów.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) void load()
    else {
      setCreating(false)
      setNewName('')
      setRevealed(null)
      setCopied(false)
      setError(null)
    }
  }, [open])

  const handleCreate = async () => {
    const name = newName.trim()
    if (!name) return
    setBusy(true)
    setError(null)
    try {
      const res = await authedFetch('/api/tokens', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { message?: string } | null
        throw new Error(j?.message ?? `HTTP ${res.status}`)
      }
      const json = (await res.json()) as { token: string; name: string }
      setRevealed({ token: json.token, name: json.name })
      setCreating(false)
      setNewName('')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nie udało się utworzyć tokenu.')
    } finally {
      setBusy(false)
    }
  }

  const handleRevoke = async (id: string, name: string) => {
    if (!confirm(`Odwołać token „${name}"? Aplikacje używające go natychmiast przestaną działać.`)) return
    setBusy(true)
    setError(null)
    try {
      const res = await authedFetch(`/api/tokens?id=${encodeURIComponent(id)}`, { method: 'DELETE' })
      if (!res.ok && res.status !== 204) throw new Error(`HTTP ${res.status}`)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Nie udało się odwołać tokenu.')
    } finally {
      setBusy(false)
    }
  }

  const handleCopy = async () => {
    if (!revealed) return
    try {
      await navigator.clipboard.writeText(revealed.token)
      setCopied(true)
    } catch {
      const el = document.getElementById('pat-textarea') as HTMLTextAreaElement | null
      el?.select()
    }
  }

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 80) onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="absolute inset-0 z-[350] flex items-end"
          style={{ background: 'rgba(13,31,26,0.4)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onClose}
        >
          <motion.div
            className="flex max-h-[88%] w-full flex-col rounded-t-[28px] bg-bg-base shadow-[0_-20px_40px_-10px_rgba(13,31,26,0.2)]"
            initial={{ y: '110%' }}
            animate={{ y: 0 }}
            exit={{ y: '110%' }}
            transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={handleDragEnd}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex-shrink-0 cursor-grab px-5 pt-3 active:cursor-grabbing">
              <div className="mx-auto mb-3 h-1 w-10 rounded-pill bg-hairline" />
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-serif text-[24px] tracking-[-0.02em]">Tokeny API</h2>
                <button
                  aria-label="Zamknij"
                  onClick={onClose}
                  className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-hairline bg-bg-card text-ink-secondary transition-all hover:border-ink-tertiary hover:text-ink-primary active:scale-[0.94]"
                >
                  <svg className="h-[16px] w-[16px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="no-scrollbar flex-1 overflow-y-auto px-5 pb-8 pt-2">
              <p className="mb-5 text-[13px] leading-relaxed text-ink-secondary">
                Długotrwałe tokeny do API i MCP. Każdego zobaczysz tylko raz — przy tworzeniu. Trzymaj
                jak hasło. Stary token unieważnij i wygeneruj nowy.
              </p>

              {/* CREATE: button lub formularz inline */}
              {!creating ? (
                <button
                  onClick={() => {
                    setError(null)
                    setCreating(true)
                  }}
                  className="mb-5 flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-5 py-3 text-[14px] font-medium text-bg-base transition-all hover:bg-accent-hover active:scale-[0.98]"
                >
                  <Plus className="h-[16px] w-[16px]" strokeWidth={2} />
                  Wygeneruj nowy token
                </button>
              ) : (
                <div className="mb-5 rounded-lg border border-hairline bg-bg-card p-4">
                  <label className="mb-2 block font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">
                    Nazwa tokenu
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="np. MCP Claude Code"
                    maxLength={80}
                    autoFocus
                    className="mb-3 w-full rounded-md border border-hairline bg-bg-base px-3 py-2.5 text-[14px] text-ink-primary outline-none focus:border-accent"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreate}
                      disabled={busy || !newName.trim()}
                      className="flex-1 rounded-md bg-accent px-4 py-2.5 text-[14px] font-medium text-bg-base transition-all hover:bg-accent-hover active:scale-[0.98] disabled:opacity-50"
                    >
                      {busy ? 'Tworzę…' : 'Utwórz'}
                    </button>
                    <button
                      onClick={() => {
                        setCreating(false)
                        setNewName('')
                      }}
                      className="rounded-md border border-hairline px-4 py-2.5 text-[14px] text-ink-secondary transition-colors hover:bg-bg-subtle"
                    >
                      Anuluj
                    </button>
                  </div>
                </div>
              )}

              {error && (
                <div className="mb-4 rounded-md border border-alert/30 bg-alert-soft px-3 py-2 text-[13px] text-alert">
                  {error}
                </div>
              )}

              {/* LIST */}
              {loading && tokens.length === 0 ? (
                <div className="text-center text-[13px] text-ink-tertiary">Wczytuję…</div>
              ) : tokens.length === 0 ? (
                <div className="rounded-lg border border-dashed border-hairline bg-bg-card px-5 py-8 text-center">
                  <KeyRound className="mx-auto mb-2 h-6 w-6 text-ink-tertiary" strokeWidth={1.4} />
                  <p className="text-[13px] text-ink-secondary">Nie masz jeszcze żadnych tokenów.</p>
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border border-hairline bg-bg-card">
                  {tokens.map((t, i) => {
                    const isRevoked = !!t.revoked_at
                    const isExpired = t.expires_at && new Date(t.expires_at).getTime() < Date.now()
                    const inactive = isRevoked || isExpired
                    return (
                      <div
                        key={t.id}
                        className={clsx(
                          'flex items-center justify-between gap-3 px-5 py-4',
                          i < tokens.length - 1 && 'border-b border-hairline',
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={clsx(
                                'truncate text-[14px]',
                                inactive ? 'text-ink-tertiary line-through' : 'text-ink-primary',
                              )}
                            >
                              {t.name}
                            </span>
                            {isRevoked && (
                              <span className="flex-shrink-0 rounded-pill bg-alert-soft px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-alert">
                                Odwołany
                              </span>
                            )}
                            {!isRevoked && isExpired && (
                              <span className="flex-shrink-0 rounded-pill bg-alert-soft px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-alert">
                                Wygasły
                              </span>
                            )}
                          </div>
                          <div className="mt-1 font-mono text-[11px] text-ink-tertiary">
                            {t.token_prefix}…
                          </div>
                          <div className="mt-1 text-[11px] leading-relaxed text-ink-tertiary">
                            Utworzony: {formatDate(t.created_at)}
                            <br />
                            Ostatnio użyty: {formatDate(t.last_used_at)}
                          </div>
                        </div>
                        {!inactive && (
                          <button
                            onClick={() => void handleRevoke(t.id, t.name)}
                            disabled={busy}
                            aria-label={`Odwołaj token ${t.name}`}
                            className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-full border border-hairline text-ink-secondary transition-all hover:border-alert hover:text-alert active:scale-[0.94] disabled:opacity-50"
                          >
                            <Trash2 className="h-[15px] w-[15px]" strokeWidth={1.6} />
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              <p className="mt-5 text-[12px] leading-relaxed text-ink-tertiary">
                Token przesyłaj w nagłówku{' '}
                <span className="font-mono text-[11px] text-ink-secondary">Authorization: Bearer od_pat_…</span>
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Modal: raw token zwrócony przez backend (pokazywany RAZ) */}
      {revealed && (
        <motion.div
          className="absolute inset-0 z-[400] flex items-center justify-center px-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="absolute inset-0 bg-ink-primary/40" onClick={() => setRevealed(null)} />
          <motion.div
            className="relative w-full max-w-[340px] rounded-xl bg-bg-card p-5 shadow-2xl"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
          >
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">
              Token utworzony
            </div>
            <h3 className="mb-3 font-serif text-[20px] text-ink-primary">{revealed.name}</h3>
            <p className="mb-3 text-[13px] leading-relaxed text-ink-secondary">
              Skopiuj go <strong>teraz</strong> — drugi raz go nie zobaczysz. Jeśli go zgubisz, odwołaj i
              wygeneruj nowy.
            </p>
            <textarea
              id="pat-textarea"
              readOnly
              value={revealed.token}
              onClick={(e) => (e.target as HTMLTextAreaElement).select()}
              className="mb-3 h-24 w-full resize-none rounded-md border border-hairline bg-bg-subtle p-2 font-mono text-[11px] leading-relaxed text-ink-primary"
            />
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="flex flex-1 items-center justify-center gap-2 rounded-md bg-accent px-4 py-2.5 text-[14px] font-medium text-bg-base transition-all hover:bg-accent-hover active:scale-[0.98]"
              >
                <Copy className="h-[14px] w-[14px]" strokeWidth={2} />
                {copied ? 'Skopiowane' : 'Skopiuj'}
              </button>
              <button
                onClick={() => setRevealed(null)}
                className="rounded-md border border-hairline px-4 py-2.5 text-[14px] text-ink-secondary transition-colors hover:bg-bg-subtle"
              >
                Gotowe
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
