import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useTokenContext } from './TokenContext'

/**
 * Sticky pasek z generatorem tokenu — wspólny dla obu zakładek docs.
 * Token = Supabase access_token z aktywnej sesji (ten sam, co używa REST i MCP).
 */
export function TokenBar() {
  const { token, setToken } = useTokenContext()
  const [revealed, setRevealed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [signedIn, setSignedIn] = useState<boolean | null>(null)

  const handleGenerate = async () => {
    setLoading(true)
    const { data } = await supabase.auth.getSession()
    const t = data.session?.access_token ?? null
    setSignedIn(!!t)
    setToken(t)
    setRevealed(false)
    setLoading(false)
  }

  const handleCopy = async () => {
    if (!token) return
    try {
      await navigator.clipboard.writeText(token)
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    } catch {
      // ignore
    }
  }

  const display = token
    ? revealed
      ? token
      : '••••••••••••••••••••••' + token.slice(-6)
    : ''

  return (
    <div className="border-b border-hairline bg-bg-card/85 backdrop-blur">
      <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-3 px-6 py-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">
          Twój token
        </span>

        {!token ? (
          <>
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="rounded-md bg-accent px-3 py-1.5 font-sans text-[13px] font-medium text-bg-card transition-colors hover:bg-accent-hover disabled:opacity-50"
            >
              {loading ? 'Pobieram…' : 'Wygeneruj token'}
            </button>
            {signedIn === false ? (
              <a
                href="/signin?next=/docs"
                className="font-sans text-[12.5px] text-alert hover:underline"
              >
                Zaloguj się żeby wygenerować
              </a>
            ) : (
              <span className="font-sans text-[12.5px] text-ink-tertiary">
                Klucz Bearer dla REST i MCP. Wartość = access_token z Twojej sesji.
              </span>
            )}
          </>
        ) : (
          <>
            <input
              readOnly
              value={display}
              className="min-w-0 flex-1 rounded-md border border-hairline bg-bg-subtle px-2.5 py-1.5 font-mono text-[12px] text-ink-primary"
            />
            <button
              onClick={() => setRevealed((v) => !v)}
              className="rounded-md border border-hairline bg-bg-card px-2.5 py-1.5 font-sans text-[12.5px] text-ink-secondary hover:text-ink-primary"
            >
              {revealed ? 'Ukryj' : 'Pokaż'}
            </button>
            <button
              onClick={handleCopy}
              className="rounded-md bg-accent px-2.5 py-1.5 font-sans text-[12.5px] font-medium text-bg-card hover:bg-accent-hover"
            >
              {copied ? 'Skopiowano' : 'Kopiuj'}
            </button>
            <button
              onClick={handleGenerate}
              className="rounded-md border border-hairline bg-bg-card px-2.5 py-1.5 font-sans text-[12.5px] text-ink-secondary hover:text-ink-primary"
            >
              Odśwież
            </button>
            <span className="basis-full font-mono text-[10.5px] text-ink-tertiary">
              Token wygasa po ~1h. Ten sam działa w REST (curl) i MCP (Claude Desktop / Cursor).
              Po wygenerowaniu przykłady kodu poniżej automatycznie używają Twojej wartości.
            </span>
          </>
        )}
      </div>
    </div>
  )
}
