import {
  Code,
  Eyebrow,
  InlineCode,
  ParamRow,
  useActiveSection,
  type SectionRef,
} from './primitives'

const SECTIONS: SectionRef[] = [
  { id: 'intro', label: 'Wprowadzenie' },
  { id: 'claude-desktop', label: 'Claude Desktop' },
  { id: 'cursor', label: 'Cursor' },
  { id: 'tools', label: 'Tools' },
  { id: 'auth', label: 'Auth & limity' },
  { id: 'troubleshooting', label: 'Troubleshooting' },
]

const MCP_URL = 'https://ostatnidzien.app/api/mcp'

function ToolHeader({ name, description }: { name: string; description: string }) {
  return (
    <div className="mb-3 mt-8 rounded-md border border-hairline bg-bg-card px-3 py-2">
      <div className="font-mono text-[13.5px] text-ink-primary">{name}</div>
      <div className="mt-1 text-[13px] leading-relaxed text-ink-secondary">{description}</div>
    </div>
  )
}

export function McpTab() {
  const active = useActiveSection(SECTIONS.map((s) => s.id))
  return (
    <div className="mx-auto flex max-w-[1200px] gap-12 px-6 py-10">
      <aside className="sticky top-32 hidden h-[calc(100vh-9rem)] w-[220px] shrink-0 overflow-y-auto md:block">
        <nav className="flex flex-col gap-1">
          <Eyebrow>MCP Server</Eyebrow>
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

      <main className="min-w-0 flex-1">
        <div className="mb-10">
          <Eyebrow>MCP Server</Eyebrow>
          <h1 className="font-serif text-[40px] leading-tight tracking-tight text-ink-primary">
            Model Context Protocol
          </h1>
          <p className="mt-3 max-w-[680px] text-[15.5px] leading-relaxed text-ink-secondary">
            Podłącz „Ostatni Dzień" jako narzędzie do Claude Desktop, Cursora albo dowolnego
            innego klienta MCP. Trzy toole CRUD na subskrypcjach, ten sam Bearer token co REST,
            zero konfiguracji po stronie serwera.
          </p>
        </div>

        <section id="intro" className="mb-12 scroll-mt-32">
          <Eyebrow>Co to jest</Eyebrow>
          <p className="text-[14.5px] leading-relaxed text-ink-secondary">
            MCP (Model Context Protocol) to standard, w którym aplikacje AI mogą wywoływać
            zdalne narzędzia. Nasz server stoi pod <InlineCode>{MCP_URL}</InlineCode> (transport
            Streamable HTTP, stateless). Każde wywołanie idzie z tym samym tokenem co REST —
            wystarczy wygenerować go w pasku na górze i wkleić w konfigurację klienta.
          </p>
        </section>

        <section id="claude-desktop" className="mb-16 scroll-mt-32">
          <Eyebrow>Quick start</Eyebrow>
          <h2 className="mb-2 font-serif text-[26px] leading-tight text-ink-primary">
            Claude Desktop
          </h2>
          <p className="mb-4 text-[14.5px] leading-relaxed text-ink-secondary">
            Otwórz <InlineCode>~/Library/Application Support/Claude/claude_desktop_config.json</InlineCode>{' '}
            (macOS) lub <InlineCode>%APPDATA%\Claude\claude_desktop_config.json</InlineCode> (Windows)
            i dodaj wpis:
          </p>
          <Code language="json">{`{
  "mcpServers": {
    "ostatni-dzien": {
      "url": "${MCP_URL}",
      "headers": {
        "Authorization": "Bearer $TOKEN"
      }
    }
  }
}`}</Code>
          <p className="mt-2 text-[13px] text-ink-tertiary">
            Zrestartuj Claude Desktop. W rozmowie pojawi się ikona narzędzi z trzema toolami.
            Spróbuj: „dodaj Spotify za 23.99 zł".
          </p>
        </section>

        <section id="cursor" className="mb-16 scroll-mt-32">
          <Eyebrow>Quick start</Eyebrow>
          <h2 className="mb-2 font-serif text-[26px] leading-tight text-ink-primary">Cursor</h2>
          <p className="mb-4 text-[14.5px] leading-relaxed text-ink-secondary">
            W Cursorze otwórz <InlineCode>Settings → MCP</InlineCode> i dodaj nowy server, albo
            wklej bezpośrednio do <InlineCode>~/.cursor/mcp.json</InlineCode>:
          </p>
          <Code language="json">{`{
  "mcpServers": {
    "ostatni-dzien": {
      "url": "${MCP_URL}",
      "headers": {
        "Authorization": "Bearer $TOKEN"
      }
    }
  }
}`}</Code>
        </section>

        <section id="tools" className="mb-16 scroll-mt-32">
          <Eyebrow>MCP · Tools</Eyebrow>
          <h2 className="mb-2 font-serif text-[28px] leading-tight text-ink-primary">
            Dostępne narzędzia
          </h2>
          <p className="mb-6 text-[14.5px] leading-relaxed text-ink-secondary">
            Trzy toole CRUD na subskrypcjach. Każdy wymaga ważnego Bearer tokenu w nagłówku
            requestu — bez tego MCP zwraca <InlineCode>401</InlineCode>.
          </p>

          <ToolHeader
            name="list_subscriptions"
            description="Zwraca aktywne i zapauzowane subskrypcje, posortowane po dniach do najbliższego pobrania."
          />
          <p className="text-[13.5px] text-ink-tertiary">Bez argumentów.</p>
          <h4 className="mt-4 mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">
            Przykład odpowiedzi
          </h4>
          <Code language="json">{`{
  "content": [{
    "type": "text",
    "text": "{ \\"subscriptions\\": [ { \\"id\\": \\"spotify\\", \\"name\\": \\"Spotify Family\\", \\"amountPLN\\": 29.99, \\"date\\": \\"6 czerwca · 8:00\\", \\"daysUntil\\": 6, \\"type\\": \\"renewal\\", \\"status\\": \\"active\\", \\"category\\": \\"audio_podcasts\\" } ] }"
  }]
}`}</Code>

          <ToolHeader
            name="add_subscription"
            description="Dodaje nową subskrypcję dla zalogowanego użytkownika. Wymaga wybrania kategorii z taksonomii Ostatni Dzień."
          />
          <div>
            <ParamRow name="name" type="string" required>
              Nazwa usługi, np. <InlineCode>"Netflix Podstawowy"</InlineCode>.
            </ParamRow>
            <ParamRow name="amountPLN" type="number" required>
              Kwota miesięczna w PLN.
            </ParamRow>
            <ParamRow
              name="category"
              type='"media_vod" | "audio_podcasts" | "design_creative" | "ai_tools" | "productivity_cloud" | "shopping_gaming" | "other"'
              required
            >
              Kategoria z 7-elementowej taksonomii: <InlineCode>media_vod</InlineCode>{' '}
              (Netflix/HBO/Disney+), <InlineCode>audio_podcasts</InlineCode>{' '}
              (Spotify/Apple Music/Audible), <InlineCode>design_creative</InlineCode>{' '}
              (Figma/Adobe/Canva), <InlineCode>ai_tools</InlineCode>{' '}
              (ChatGPT/Claude/Midjourney), <InlineCode>productivity_cloud</InlineCode>{' '}
              (Notion/Slack/iCloud/1Password/VPN), <InlineCode>shopping_gaming</InlineCode>{' '}
              (Prime/Xbox/PlayStation), <InlineCode>other</InlineCode>.
            </ParamRow>
            <ParamRow name="daysUntil" type="integer">
              Dni do najbliższego pobrania. Domyślnie <InlineCode>0</InlineCode>.
            </ParamRow>
            <ParamRow name="type" type='"trial" | "renewal"'>
              Domyślnie <InlineCode>"renewal"</InlineCode>.
            </ParamRow>
          </div>
          <h4 className="mt-4 mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">
            Przykład wywołania
          </h4>
          <Code language="json">{`{
  "name": "add_subscription",
  "arguments": {
    "name": "HBO Max",
    "amountPLN": 31.99,
    "category": "media_vod",
    "daysUntil": 12,
    "type": "renewal"
  }
}`}</Code>
          <h4 className="mt-2 mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">
            Przykład odpowiedzi
          </h4>
          <Code language="json">{`{
  "content": [{
    "type": "text",
    "text": "{ \\"subscription\\": { \\"id\\": \\"user-1781200065271\\", \\"name\\": \\"HBO Max\\", \\"amountPLN\\": 31.99, \\"date\\": \\"23 czerwca · 9:00\\", \\"daysUntil\\": 12, \\"type\\": \\"renewal\\", \\"status\\": \\"active\\", \\"category\\": \\"media_vod\\" } }"
  }]
}`}</Code>

          <ToolHeader
            name="update_subscription_status"
            description='Zmienia status istniejącej subskrypcji ("active" | "paused" | "cancelled").'
          />
          <div>
            <ParamRow name="id" type="string" required>
              Identyfikator subskrypcji (z <InlineCode>list_subscriptions</InlineCode>).
            </ParamRow>
            <ParamRow name="status" type='"active" | "paused" | "cancelled"' required>
              Docelowy status. <InlineCode>cancelled</InlineCode> nie usuwa wiersza fizycznie.
            </ParamRow>
          </div>
          <h4 className="mt-4 mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">
            Przykład wywołania
          </h4>
          <Code language="json">{`{
  "name": "update_subscription_status",
  "arguments": { "id": "user-1781200065271", "status": "paused" }
}`}</Code>
          <h4 className="mt-2 mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">
            Przykład odpowiedzi
          </h4>
          <Code language="json">{`{
  "content": [{
    "type": "text",
    "text": "{ \\"subscription\\": { \\"id\\": \\"user-1781200065271\\", \\"name\\": \\"HBO Max\\", \\"status\\": \\"paused\\" } }"
  }]
}`}</Code>

          <ToolHeader
            name="list_journal_entries"
            description="Pamięć długoterminowa agenta. Zwraca podsumowania zamkniętych konwersacji usera z Subskrypcikiem — kategoria, tytuł, 2–3 zdania wniosku, czas trwania, liczba dołączonych zdjęć."
          />
          <div>
            <ParamRow name="from" type="ISO 8601 string">
              Początek zakresu. Domyślnie 60 dni temu.
            </ParamRow>
            <ParamRow name="to" type="ISO 8601 string">
              Koniec zakresu. Domyślnie teraz.
            </ParamRow>
            <ParamRow
              name="category"
              type='"media_vod" | "audio_podcasts" | "design_creative" | "ai_tools" | "productivity_cloud" | "shopping_gaming" | "other"'
            >
              Opcjonalny filtr po kategorii.
            </ParamRow>
            <ParamRow name="limit" type="integer (1–100)">
              Domyślnie <InlineCode>50</InlineCode>.
            </ParamRow>
          </div>
          <h4 className="mt-4 mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">
            Przykład wywołania
          </h4>
          <Code language="json">{`{
  "name": "list_journal_entries",
  "arguments": { "category": "media_vod", "limit": 10 }
}`}</Code>
          <h4 className="mt-2 mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">
            Przykład odpowiedzi
          </h4>
          <Code language="json">{`{
  "content": [{
    "type": "text",
    "text": "{ \\"entries\\": [ { \\"id\\": \\"fbd953bf-...\\", \\"startedAt\\": \\"2026-06-12T18:30:00Z\\", \\"endedAt\\": \\"2026-06-12T18:42:00Z\\", \\"category\\": \\"media_vod\\", \\"title\\": \\"Canal+ — brak informacji o cenach\\", \\"summary\\": \\"...\\", \\"messageCount\\": 8, \\"photoCount\\": 2 } ] }"
  }]
}`}</Code>

          <h3 className="mt-10 mb-3 font-sans text-[18px] font-semibold text-ink-primary">
            list_personas
          </h3>
          <p className="mb-3 text-[14px] leading-relaxed text-ink-secondary">
            Zwraca katalog doradców AI z informacją które user posiada i która jest aktywna.
            <InlineCode>system_prompt</InlineCode> nie jest zwracany — chroniona własność.
          </p>
          <Code language="json">{`{
  "name": "list_personas",
  "arguments": {}
}`}</Code>

          <h3 className="mt-10 mb-3 font-sans text-[18px] font-semibold text-ink-primary">
            get_active_persona
          </h3>
          <p className="mb-3 text-[14px] leading-relaxed text-ink-secondary">
            Krótki status: id + nazwa + tagline aktywnej persony usera.
          </p>
          <Code language="json">{`{
  "name": "get_active_persona",
  "arguments": {}
}`}</Code>

          <h3 className="mt-10 mb-3 font-sans text-[18px] font-semibold text-ink-primary">
            change_active_persona
          </h3>
          <p className="mb-3 text-[14px] leading-relaxed text-ink-secondary">
            Przełącza aktywnego doradcę. Wymaga że user posiada personę
            (free albo kupioną). Brak entitlementu → <InlineCode>not_owned</InlineCode>.
            Tool nie inicjuje zakupów — do tego user musi przejść przez UI.
          </p>
          <Code language="json">{`{
  "name": "change_active_persona",
  "arguments": { "personaId": "mecenas" }
}`}</Code>

          <h3 className="mt-10 mb-3 font-sans text-[18px] font-semibold text-ink-primary">
            Błędy
          </h3>
          <ul className="space-y-2 text-[14px] leading-relaxed text-ink-secondary">
            <li>
              <InlineCode>401 unauthorized</InlineCode> — brak headera{' '}
              <InlineCode>Authorization</InlineCode> albo token wygasł / nieważny.
            </li>
            <li>
              <InlineCode>isError: true</InlineCode> w treści odpowiedzi tool call — błąd
              biznesowy (np. <InlineCode>not_found</InlineCode> przy nieswoim id,{' '}
              <InlineCode>invalid_body</InlineCode> przy pustym <InlineCode>name</InlineCode>).
              Treść błędu jest w <InlineCode>content[0].text</InlineCode>.
            </li>
            <li>
              Niepoprawne argumenty (zła nazwa pola, zły typ) → zwracane przez MCP SDK jako
              błąd walidacji JSON-RPC <InlineCode>-32602</InlineCode>.
            </li>
          </ul>

          <h4 className="mt-8 mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">
            Surowy JSON-RPC (do debugowania)
          </h4>
          <Code language="bash">{`curl -X POST ${MCP_URL} \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -H "Accept: application/json, text/event-stream" \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'`}</Code>
        </section>

        <section id="auth" className="mb-16 scroll-mt-32">
          <Eyebrow>Autoryzacja i limity</Eyebrow>
          <h2 className="mb-2 font-serif text-[24px] leading-tight text-ink-primary">
            Bearer token = Twoja sesja Supabase
          </h2>
          <p className="mb-3 text-[14px] leading-relaxed text-ink-secondary">
            Klient MCP wysyła token przy każdym requeście (header{' '}
            <InlineCode>Authorization: Bearer …</InlineCode>). Server waliduje go po stronie
            Supabase i operuje na bazie z RLS w imieniu Twojego usera — żadne inne konto nie jest
            widoczne.
          </p>
          <p className="text-[14px] leading-relaxed text-ink-secondary">
            Tooly MCP <strong>nie</strong> wliczają się do limitu 20 wiadomości/dzień (ten limit
            obowiązuje tylko endpoint <InlineCode>/api/ask</InlineCode>). MCP jest czysto
            transakcyjny: list / add / update.
          </p>
        </section>

        <section id="troubleshooting" className="mb-24 scroll-mt-32">
          <Eyebrow>Troubleshooting</Eyebrow>
          <h2 className="mb-2 font-serif text-[24px] leading-tight text-ink-primary">
            Coś nie działa?
          </h2>
          <ul className="mt-4 space-y-3 text-[14px] leading-relaxed text-ink-secondary">
            <li>
              <strong>401 unauthorized</strong> — token wygasł (TTL ~1h). Wygeneruj nowy w pasku
              na górze i podmień w konfigu klienta.
            </li>
            <li>
              <strong>Klient nie widzi narzędzi</strong> — sprawdź czy URL ma <InlineCode>/api/mcp</InlineCode>{' '}
              (nie <InlineCode>/mcp</InlineCode>) i czy header jest dokładnie{' '}
              <InlineCode>Authorization</InlineCode> z prefiksem <InlineCode>Bearer </InlineCode>.
            </li>
            <li>
              <strong>Claude Desktop pokazuje puste tools</strong> — zrestartuj appkę po edycji
              configu (Cmd+Q, nie tylko zamknięcie okna).
            </li>
            <li>
              <strong>Server zwraca dziwny błąd na <InlineCode>add_subscription</InlineCode></strong>{' '}
              — sprawdź czy <InlineCode>amountPLN</InlineCode> jest liczbą, nie stringiem.
            </li>
          </ul>
        </section>
      </main>
    </div>
  )
}
