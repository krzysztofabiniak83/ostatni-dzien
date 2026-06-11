import { motion, useReducedMotion } from 'framer-motion'

export type DocsTab = 'api' | 'mcp'

export function DocsTabs({
  tab,
  onChange,
}: {
  tab: DocsTab
  onChange: (t: DocsTab) => void
}) {
  const reduce = useReducedMotion()
  const tabs: { id: DocsTab; label: string }[] = [
    { id: 'api', label: 'API' },
    { id: 'mcp', label: 'MCP' },
  ]
  return (
    <div className="border-b border-hairline bg-bg-base/85 backdrop-blur">
      <div className="mx-auto flex max-w-[1200px] gap-1 px-6">
        {tabs.map((t) => {
          const active = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => onChange(t.id)}
              className={`relative px-3 py-2.5 font-sans text-[13.5px] transition-colors ${
                active ? 'text-ink-primary' : 'text-ink-secondary hover:text-ink-primary'
              }`}
            >
              {t.label}
              {active ? (
                <motion.span
                  layoutId={reduce ? undefined : 'docs-tab-underline'}
                  className="absolute inset-x-2 -bottom-px h-[2px] bg-accent"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}
