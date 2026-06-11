import { useEffect, useState } from 'react'
import { useTokenContext } from './TokenContext'

export type SectionRef = { id: string; label: string }

export function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0])
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (visible) setActive(visible.target.id)
      },
      { rootMargin: '-20% 0px -60% 0px', threshold: 0 },
    )
    ids.forEach((id) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [ids])
  return active
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">
      {children}
    </div>
  )
}

export function MethodBadge({ method }: { method: 'GET' | 'POST' | 'PATCH' }) {
  const color =
    method === 'GET'
      ? 'bg-accent-soft text-accent'
      : method === 'POST'
        ? 'bg-[#E8EEEB] text-accent'
        : 'bg-alert-soft text-alert'
  return (
    <span
      className={`inline-flex items-center rounded-sm px-1.5 py-0.5 font-mono text-[11px] font-medium uppercase tracking-[0.08em] ${color}`}
    >
      {method}
    </span>
  )
}

/**
 * Code block. Jeśli treść zawiera `$TOKEN`, podstawia bieżący token z TokenContext
 * (gdy user wygenerował go w pasku na górze). To jest detal który robi „wow" jak w Stripe/Vercel docs.
 */
export function Code({ children, language }: { children: string; language?: string }) {
  const { token } = useTokenContext()
  const display = token ? children.replaceAll('$TOKEN', token) : children
  return (
    <pre className="my-4 overflow-x-auto rounded-md border border-hairline bg-bg-subtle px-4 py-3 font-mono text-[12.5px] leading-relaxed text-ink-primary">
      {language ? (
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">
          {language}
        </div>
      ) : null}
      <code>{display}</code>
    </pre>
  )
}

export function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded-sm bg-bg-subtle px-1.5 py-0.5 font-mono text-[12.5px] text-ink-primary">
      {children}
    </code>
  )
}

export function ParamRow({
  name,
  type,
  required,
  children,
}: {
  name: string
  type: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="border-b border-hairline py-3 last:border-b-0">
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-[13px] font-medium text-ink-primary">{name}</span>
        <span className="font-mono text-[11px] text-ink-tertiary">{type}</span>
        {required ? (
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-alert">
            required
          </span>
        ) : null}
      </div>
      <p className="mt-1 text-[13.5px] leading-relaxed text-ink-secondary">{children}</p>
    </div>
  )
}

export function EndpointHeader({
  method,
  path,
}: {
  method: 'GET' | 'POST' | 'PATCH'
  path: string
}) {
  return (
    <div className="mb-4 flex items-center gap-3 rounded-md border border-hairline bg-bg-card px-3 py-2">
      <MethodBadge method={method} />
      <code className="font-mono text-[13.5px] text-ink-primary">{path}</code>
    </div>
  )
}
