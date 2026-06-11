import { useEffect, useState } from 'react'

/**
 * Strona /docs — publiczna dokumentacja endpointów API.
 * Layout wzorowany na docs Vercela: lewa kolumna nawigacji + długa kolumna treści.
 * Nie jest opakowana w PhoneFrame (renderowana z poziomu App przed PhoneFrame).
 */

type Section = { id: string; label: string }

const SECTIONS: Section[] = [
  { id: 'create', label: 'Create' },
  { id: 'ask', label: 'Ask' },
  { id: 'read', label: 'Read' },
]

function useActiveSection(ids: string[]) {
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

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">
      {children}
    </div>
  )
}

function MethodBadge({ method }: { method: 'GET' | 'POST' | 'PATCH' }) {
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

function Code({ children, language }: { children: string; language?: string }) {
  return (
    <pre className="my-4 overflow-x-auto rounded-md border border-hairline bg-bg-subtle px-4 py-3 font-mono text-[12.5px] leading-relaxed text-ink-primary">
      {language ? (
        <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">
          {language}
        </div>
      ) : null}
      <code>{children}</code>
    </pre>
  )
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded-sm bg-bg-subtle px-1.5 py-0.5 font-mono text-[12.5px] text-ink-primary">
      {children}
    </code>
  )
}

function ParamRow({
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

function EndpointHeader({
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

export function Docs() {
  const active = useActiveSection(SECTIONS.map((s) => s.id))

  return (
    <div className="min-h-screen bg-bg-base text-ink-primary">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-hairline bg-bg-base/85 backdrop-blur">
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
      </header>

      <div className="mx-auto flex max-w-[1200px] gap-12 px-6 py-10">
        {/* Sidebar */}
        <aside className="sticky top-20 hidden h-[calc(100vh-5rem)] w-[220px] shrink-0 overflow-y-auto md:block">
          <nav className="flex flex-col gap-1">
            <Eyebrow>API</Eyebrow>
            {SECTIONS.map((s) => {
              const isActive = active === s.id
              return (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className={`-mx-2 rounded-md px-2 py-1.5 text-[14px] transition-colors ${
                    isActive
                      ? 'bg-accent-soft font-medium text-accent'
                      : 'text-ink-secondary hover:bg-bg-subtle hover:text-ink-primary'
                  }`}
                >
                  {s.label}
                </a>
              )
            })}
          </nav>
        </aside>

        {/* Content */}
        <main className="min-w-0 flex-1">
          <div className="mb-10">
            <Eyebrow>Dokumentacja</Eyebrow>
            <h1 className="font-serif text-[40px] leading-tight tracking-tight text-ink-primary">
              API Reference
            </h1>
            <p className="mt-3 max-w-[640px] text-[15.5px] leading-relaxed text-ink-secondary">
              Trzy endpointy do programowego sterowania kontem w aplikacji „Ostatni Dzień":
              dodawanie i zmiana statusu subskrypcji, pytanie do agenta Subskrypcik oraz
              odczyt listy.
            </p>
          </div>

          {/* Auth — wspólne info */}
          <section className="mb-12 rounded-lg border border-hairline bg-bg-card p-5">
            <Eyebrow>Autoryzacja</Eyebrow>
            <p className="text-[14px] leading-relaxed text-ink-secondary">
              Każde żądanie wymaga nagłówka <InlineCode>Authorization: Bearer &lt;token&gt;</InlineCode>{' '}
              gdzie <InlineCode>token</InlineCode> to <InlineCode>access_token</InlineCode> z aktywnej
              sesji Supabase. RLS po stronie bazy gwarantuje izolację per użytkownik. Endpointy
              AI (<InlineCode>/api/ask</InlineCode>) podlegają wspólnemu limitowi{' '}
              <strong>20 wiadomości / użytkownik / dzień</strong>.
            </p>
          </section>

          {/* CREATE */}
          <section id="create" className="mb-16 scroll-mt-20">
            <Eyebrow>API · Create</Eyebrow>
            <h2 className="mb-2 font-serif text-[28px] leading-tight text-ink-primary">
              Dodaj lub zmień subskrypcję
            </h2>
            <p className="mb-6 text-[14.5px] leading-relaxed text-ink-secondary">
              Dwie operacje na zasobie <InlineCode>subscriptions</InlineCode>: utworzenie nowej
              pozycji (<strong>POST</strong>) i zmiana statusu istniejącej (<strong>PATCH</strong>).
              Subskrypcje są zawsze miesięczne; <em>cancelled</em> i <em>paused</em> zostają w bazie
              (można je wznowić, ustawiając <InlineCode>active</InlineCode>).
            </p>

            <h3 className="mt-8 mb-3 font-sans text-[18px] font-semibold text-ink-primary">
              Utwórz subskrypcję
            </h3>
            <EndpointHeader method="POST" path="/api/subscriptions" />

            <h4 className="mt-6 mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">
              Body
            </h4>
            <div>
              <ParamRow name="name" type="string" required>
                Nazwa usługi, np. <InlineCode>"Netflix Podstawowy"</InlineCode>.
              </ParamRow>
              <ParamRow name="amountPLN" type="number" required>
                Kwota w PLN (może mieć ułamek, np. <InlineCode>29.99</InlineCode>).
              </ParamRow>
              <ParamRow name="daysUntil" type="integer">
                Liczba dni od dziś do następnego pobrania. Domyślnie <InlineCode>0</InlineCode> (dziś).
              </ParamRow>
              <ParamRow name="type" type='"trial" | "renewal"'>
                Domyślnie <InlineCode>"renewal"</InlineCode>. <InlineCode>"trial"</InlineCode> tylko
                gdy świadomie zaznaczasz okres próbny.
              </ParamRow>
            </div>

            <h4 className="mt-6 mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">
              Przykład
            </h4>
            <Code language="curl">{`curl -X POST https://ostatnidzien.app/api/subscriptions \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Netflix","amountPLN":29.99}'`}</Code>

            <h4 className="mt-2 mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">
              Odpowiedź — 201
            </h4>
            <Code language="json">{`{
  "subscription": {
    "id": "user-1717250000000",
    "name": "Netflix",
    "amountPLN": 29.99,
    "date": "Dziś · 9:00",
    "daysUntil": 0,
    "type": "renewal",
    "status": "active"
  }
}`}</Code>

            <h3 className="mt-10 mb-3 font-sans text-[18px] font-semibold text-ink-primary">
              Zmień status
            </h3>
            <EndpointHeader method="PATCH" path="/api/subscriptions/:id" />

            <h4 className="mt-6 mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">
              Body
            </h4>
            <div>
              <ParamRow name="status" type='"active" | "paused" | "cancelled"' required>
                Docelowy status. <InlineCode>cancelled</InlineCode> nie usuwa wiersza — żeby usunąć
                fizycznie, użyj agenta AI z poleceniem „usuń".
              </ParamRow>
            </div>

            <h4 className="mt-6 mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">
              Przykład
            </h4>
            <Code language="curl">{`curl -X PATCH https://ostatnidzien.app/api/subscriptions/user-1717250000000 \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"status":"paused"}'`}</Code>

            <h4 className="mt-2 mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">
              Odpowiedź — 200
            </h4>
            <Code language="json">{`{
  "subscription": {
    "id": "user-1717250000000",
    "name": "Netflix",
    "status": "paused"
  }
}`}</Code>

            <p className="mt-4 text-[13px] text-ink-tertiary">
              Błędy: <InlineCode>400</InlineCode> dla niepoprawnego statusu,{' '}
              <InlineCode>404</InlineCode> gdy id nie należy do zalogowanego usera.
            </p>
          </section>

          {/* ASK */}
          <section id="ask" className="mb-16 scroll-mt-20">
            <Eyebrow>API · Ask</Eyebrow>
            <h2 className="mb-2 font-serif text-[28px] leading-tight text-ink-primary">
              Zapytaj agenta AI
            </h2>
            <p className="mb-6 text-[14.5px] leading-relaxed text-ink-secondary">
              One-shot Q&amp;A do Subskrypcika. Bez streamingu, bez efektów ubocznych na bazie —
              zwraca jedną odpowiedź w JSON. Opcjonalnie wstrzykuje snapshot Twoich aktywnych
              subskrypcji jako kontekst (suma, lista, najbliższe pobrania).
            </p>

            <EndpointHeader method="POST" path="/api/ask" />

            <h4 className="mt-6 mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">
              Body
            </h4>
            <div>
              <ParamRow name="question" type="string" required>
                Pytanie do agenta. Polski, naturalne zdanie.
              </ParamRow>
              <ParamRow name="includeSubscriptions" type="boolean">
                Gdy <InlineCode>true</InlineCode>, do system message dokleja listę aktywnych
                subskrypcji. Domyślnie <InlineCode>false</InlineCode>.
              </ParamRow>
            </div>

            <h4 className="mt-6 mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">
              Przykład
            </h4>
            <Code language="curl">{`curl -X POST https://ostatnidzien.app/api/ask \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"question":"Ile wydaję miesięcznie?","includeSubscriptions":true}'`}</Code>

            <h4 className="mt-2 mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">
              Odpowiedź — 200
            </h4>
            <Code language="json">{`{
  "answer": "**434,96 zł** miesięcznie z 8 aktywnych subskrypcji. Największe pozycje: Netflix **29,99 zł** i Adobe CC **272,99 zł**. Rozbić listę?"
}`}</Code>

            <p className="mt-4 text-[13px] text-ink-tertiary">
              Po przekroczeniu limitu 20/dzień endpoint zwraca{' '}
              <InlineCode>429</InlineCode> z <InlineCode>{`{ "error": "rate_limit" }`}</InlineCode>.
              Licznik resetuje się o północy UTC.
            </p>
          </section>

          {/* READ */}
          <section id="read" className="mb-24 scroll-mt-20">
            <Eyebrow>API · Read</Eyebrow>
            <h2 className="mb-2 font-serif text-[28px] leading-tight text-ink-primary">
              Pobierz listę subskrypcji
            </h2>
            <p className="mb-6 text-[14.5px] leading-relaxed text-ink-secondary">
              Zwraca wszystkie subskrypcje użytkownika ze statusem{' '}
              <InlineCode>active</InlineCode> lub <InlineCode>paused</InlineCode>, posortowane
              rosnąco po liczbie dni do następnego pobrania.
            </p>

            <EndpointHeader method="GET" path="/api/subscriptions" />

            <h4 className="mt-6 mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">
              Przykład
            </h4>
            <Code language="curl">{`curl https://ostatnidzien.app/api/subscriptions \\
  -H "Authorization: Bearer $TOKEN"`}</Code>

            <h4 className="mt-2 mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">
              Odpowiedź — 200
            </h4>
            <Code language="json">{`{
  "subscriptions": [
    {
      "id": "user-1717250000000",
      "name": "Netflix",
      "amountPLN": 29.99,
      "date": "Dziś · 9:00",
      "daysUntil": 0,
      "type": "renewal",
      "status": "active"
    },
    {
      "id": "user-1717100000000",
      "name": "Spotify",
      "amountPLN": 23.99,
      "date": "14 czerwca · 9:00",
      "daysUntil": 3,
      "type": "renewal",
      "status": "paused"
    }
  ]
}`}</Code>
          </section>
        </main>
      </div>
    </div>
  )
}
