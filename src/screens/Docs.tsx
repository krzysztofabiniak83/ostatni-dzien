import { useEffect, useState } from 'react'
import { TokenProvider } from '../components/docs/TokenContext'
import { TokenBar } from '../components/docs/TokenBar'
import { DocsTabs, type DocsTab } from '../components/docs/DocsTabs'
import { ApiTab } from '../components/docs/ApiTab'
import { McpTab } from '../components/docs/McpTab'

/**
 * Strona /docs — publiczna dokumentacja, dwie zakładki (API i MCP) ze
 * wspólnym paskiem generatora tokenu na górze (wzorowane na docs Vercela).
 */

function readTabFromUrl(): DocsTab {
  if (typeof window === 'undefined') return 'api'
  const sp = new URLSearchParams(window.location.search)
  return sp.get('tab') === 'mcp' ? 'mcp' : 'api'
}

export function Docs() {
  const [tab, setTab] = useState<DocsTab>(readTabFromUrl)

  useEffect(() => {
    const url = new URL(window.location.href)
    if (tab === 'api') url.searchParams.delete('tab')
    else url.searchParams.set('tab', tab)
    window.history.replaceState(null, '', url.toString())
  }, [tab])

  return (
    <TokenProvider>
      <div className="min-h-screen bg-bg-base text-ink-primary">
        <header className="sticky top-0 z-20">
          <div className="border-b border-hairline bg-bg-base/85 backdrop-blur">
            <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-6">
              <a href="/" className="flex items-center gap-2">
                <span className="font-serif text-[18px] italic text-accent">Ostatni Dzień</span>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">
                  docs
                </span>
              </a>
              <a
                href="/"
                className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-secondary hover:text-ink-primary"
              >
                ← Wróć do aplikacji
              </a>
            </div>
          </div>
          <TokenBar />
          <DocsTabs tab={tab} onChange={setTab} />
        </header>

        {tab === 'api' ? <ApiTab /> : <McpTab />}
      </div>
    </TokenProvider>
  )
}
