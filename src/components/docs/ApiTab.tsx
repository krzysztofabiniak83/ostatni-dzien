import {
  Code,
  EndpointHeader,
  Eyebrow,
  InlineCode,
  ParamRow,
  useActiveSection,
  type SectionRef,
} from './primitives'

const SECTIONS: SectionRef[] = [
  { id: 'auth', label: 'Autoryzacja' },
  { id: 'create', label: 'Create' },
  { id: 'ask', label: 'Ask' },
  { id: 'read', label: 'Read' },
  { id: 'journal', label: 'Journal' },
  { id: 'journal-photos', label: 'Journal photos' },
]

export function ApiTab() {
  const active = useActiveSection(SECTIONS.map((s) => s.id))
  return (
    <div className="mx-auto flex max-w-[1200px] gap-12 px-6 py-10">
      <aside className="sticky top-32 hidden h-[calc(100vh-9rem)] w-[220px] shrink-0 overflow-y-auto md:block">
        <nav className="flex flex-col gap-1">
          <Eyebrow>REST API</Eyebrow>
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
          <Eyebrow>REST API</Eyebrow>
          <h1 className="font-serif text-[40px] leading-tight tracking-tight text-ink-primary">
            API Reference
          </h1>
          <p className="mt-3 max-w-[640px] text-[15.5px] leading-relaxed text-ink-secondary">
            Trzy endpointy do programowego sterowania kontem w aplikacji „Ostatni Dzień":
            dodawanie i zmiana statusu subskrypcji, pytanie do agenta Subskrypcik oraz
            odczyt listy.
          </p>
        </div>

        <section id="auth" className="mb-12 scroll-mt-32 rounded-lg border border-hairline bg-bg-card p-5">
          <Eyebrow>Autoryzacja</Eyebrow>
          <p className="text-[14px] leading-relaxed text-ink-secondary">
            Każde żądanie wymaga nagłówka <InlineCode>Authorization: Bearer &lt;token&gt;</InlineCode>{' '}
            gdzie <InlineCode>token</InlineCode> to <InlineCode>access_token</InlineCode> z aktywnej
            sesji Supabase. RLS po stronie bazy gwarantuje izolację per użytkownik. Endpointy
            AI (<InlineCode>/api/ask</InlineCode>) podlegają wspólnemu limitowi{' '}
            <strong>20 wiadomości / użytkownik / dzień</strong>.
          </p>
        </section>

        <section id="create" className="mb-16 scroll-mt-32">
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
          <h4 className="mt-6 mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">Body</h4>
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
            <ParamRow
              name="category"
              type='"media_vod" | "audio_podcasts" | "design_creative" | "ai_tools" | "productivity_cloud" | "shopping_gaming" | "other"'
            >
              Kategoria taksonomii Ostatni Dzień. Opcjonalna w REST — gdy pominiesz, ląduje
              w <InlineCode>"other"</InlineCode>. Agent AI (chat + MCP) wymusza wybór jednej
              z 7 wartości.
            </ParamRow>
          </div>
          <h4 className="mt-6 mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">Przykład</h4>
          <Code language="curl">{`curl -X POST https://ostatnidzien.app/api/subscriptions \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"Netflix","amountPLN":29.99,"category":"media_vod"}'`}</Code>
          <h4 className="mt-2 mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">Odpowiedź — 201</h4>
          <Code language="json">{`{
  "subscription": {
    "id": "user-1717250000000",
    "name": "Netflix",
    "amountPLN": 29.99,
    "date": "Dziś · 9:00",
    "daysUntil": 0,
    "type": "renewal",
    "status": "active",
    "category": "media_vod"
  }
}`}</Code>

          <h3 className="mt-10 mb-3 font-sans text-[18px] font-semibold text-ink-primary">Zmień status</h3>
          <EndpointHeader method="PATCH" path="/api/subscriptions/:id" />
          <h4 className="mt-6 mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">Body</h4>
          <div>
            <ParamRow name="status" type='"active" | "paused" | "cancelled"' required>
              Docelowy status. <InlineCode>cancelled</InlineCode> nie usuwa wiersza — żeby usunąć
              fizycznie, użyj agenta AI z poleceniem „usuń".
            </ParamRow>
          </div>
          <h4 className="mt-6 mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">Przykład</h4>
          <Code language="curl">{`curl -X PATCH https://ostatnidzien.app/api/subscriptions/user-1717250000000 \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"status":"paused"}'`}</Code>
          <h4 className="mt-2 mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">Odpowiedź — 200</h4>
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

        <section id="ask" className="mb-16 scroll-mt-32">
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
          <h4 className="mt-6 mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">Body</h4>
          <div>
            <ParamRow name="question" type="string" required>
              Pytanie do agenta. Polski, naturalne zdanie.
            </ParamRow>
            <ParamRow name="includeSubscriptions" type="boolean">
              Gdy <InlineCode>true</InlineCode>, do system message dokleja listę aktywnych
              subskrypcji. Domyślnie <InlineCode>false</InlineCode>.
            </ParamRow>
          </div>
          <h4 className="mt-6 mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">Przykład</h4>
          <Code language="curl">{`curl -X POST https://ostatnidzien.app/api/ask \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"question":"Ile wydaję miesięcznie?","includeSubscriptions":true}'`}</Code>
          <h4 className="mt-2 mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">Odpowiedź — 200</h4>
          <Code language="json">{`{
  "answer": "**434,96 zł** miesięcznie z 8 aktywnych subskrypcji. Największe pozycje: Netflix **29,99 zł** i Adobe CC **272,99 zł**. Rozbić listę?"
}`}</Code>
          <p className="mt-4 text-[13px] text-ink-tertiary">
            Po przekroczeniu limitu 20/dzień endpoint zwraca{' '}
            <InlineCode>429</InlineCode> z <InlineCode>{`{ "error": "rate_limit" }`}</InlineCode>.
            Licznik resetuje się o północy UTC.
          </p>
        </section>

        <section id="read" className="mb-24 scroll-mt-32">
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
          <h4 className="mt-6 mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">Przykład</h4>
          <Code language="curl">{`curl https://ostatnidzien.app/api/subscriptions \\
  -H "Authorization: Bearer $TOKEN"`}</Code>
          <h4 className="mt-2 mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">Odpowiedź — 200</h4>
          <Code language="json">{`{
  "subscriptions": [
    {
      "id": "user-1717250000000",
      "name": "Netflix",
      "amountPLN": 29.99,
      "date": "Dziś · 9:00",
      "daysUntil": 0,
      "type": "renewal",
      "status": "active",
      "category": "media_vod"
    }
  ]
}`}</Code>
        </section>

        <section id="journal" className="mb-24 scroll-mt-32">
          <Eyebrow>API · Journal</Eyebrow>
          <h2 className="mb-2 font-serif text-[28px] leading-tight text-ink-primary">
            Dzienniczek Rozmów
          </h2>
          <p className="mb-6 text-[14.5px] leading-relaxed text-ink-secondary">
            Persystowane podsumowania konwersacji z Subskrypcikiem: kategoria z taksonomii,
            tytuł, 2-3 zdania wniosku. Sesje krótsze niż 4 wiadomości są pomijane.
          </p>

          <h3 className="mt-8 mb-3 font-sans text-[18px] font-semibold text-ink-primary">
            Pobierz historię
          </h3>
          <EndpointHeader method="GET" path="/api/journal" />
          <h4 className="mt-6 mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">Query</h4>
          <div>
            <ParamRow name="from" type="ISO 8601 string">
              Początek zakresu. Domyślnie 60 dni temu.
            </ParamRow>
            <ParamRow name="to" type="ISO 8601 string">
              Koniec zakresu. Domyślnie teraz.
            </ParamRow>
          </div>
          <h4 className="mt-6 mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">Przykład</h4>
          <Code language="curl">{`curl "https://ostatnidzien.app/api/journal?from=2026-05-01&to=2026-06-30" \\
  -H "Authorization: Bearer $TOKEN"`}</Code>
          <h4 className="mt-2 mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">Odpowiedź — 200</h4>
          <Code language="json">{`{
  "conversations": [
    {
      "id": "fbd953bf-23f0-456c-94ce-102570d74f04",
      "startedAt": "2026-06-12T18:30:00.000Z",
      "endedAt":   "2026-06-12T18:42:00.000Z",
      "category": "media_vod",
      "title": "Canal+ — brak informacji o cenach",
      "summary": "Subskrypcik nie znalazł aktualnego cennika Canal+...",
      "messageCount": 8,
      "photos": [
        {
          "id": "02c1f0d4-2943-46e2-af76-30cddd59b0dd",
          "signedUrl": "https://ehfrpymyshwvhkbskvsf.supabase.co/storage/v1/object/sign/journal-photos/...",
          "mimeType": "image/jpeg",
          "width": 1200,
          "height": 900,
          "position": 0
        }
      ]
    }
  ]
}`}</Code>
          <p className="mt-3 text-[13px] leading-relaxed text-ink-tertiary">
            <InlineCode>signedUrl</InlineCode> wygasa po 1h. Odśwież listę żeby pobrać świeże URLe.
          </p>

          <h3 className="mt-10 mb-3 font-sans text-[18px] font-semibold text-ink-primary">
            Zapisz zamkniętą sesję
          </h3>
          <p className="mb-4 text-[13px] text-ink-tertiary">
            Wywoływane automatycznie przez frontend przy zamknięciu czatu. Jeśli{' '}
            <InlineCode>messages.length &lt; 4</InlineCode>, endpoint zwraca{' '}
            <InlineCode>{`{ skipped: true }`}</InlineCode> bez zapisu.
          </p>
          <EndpointHeader method="POST" path="/api/journal" />
          <h4 className="mt-6 mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">Body</h4>
          <div>
            <ParamRow name="action" type='"finalize"' required>
              Stała wartość.
            </ParamRow>
            <ParamRow name="messages" type="Array<{ role, content }>" required>
              Pełna historia rozmowy (user + assistant). Backend wywołuje LLM żeby
              wygenerować tytuł, kategorię i podsumowanie.
            </ParamRow>
            <ParamRow name="startedAt" type="ISO 8601 string" required>
              Moment pierwszej wiadomości.
            </ParamRow>
            <ParamRow name="endedAt" type="ISO 8601 string" required>
              Moment zamknięcia czatu.
            </ParamRow>
          </div>
          <h4 className="mt-2 mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">Odpowiedź — 200</h4>
          <Code language="json">{`{
  "ok": true,
  "saved": {
    "id": "fbd953bf-23f0-456c-94ce-102570d74f04",
    "startedAt": "2026-06-12T18:30:00.000Z",
    "endedAt":   "2026-06-12T18:42:00.000Z",
    "category": "media_vod",
    "title": "Canal+ — brak informacji o cenach",
    "summary": "...",
    "messageCount": 8
  }
}`}</Code>
        </section>

        <section id="journal-photos" className="mb-24 scroll-mt-32">
          <Eyebrow>API · Journal photos</Eyebrow>
          <h2 className="mb-2 font-serif text-[28px] leading-tight text-ink-primary">
            Zdjęcia do wpisów dzienniczka
          </h2>
          <p className="mb-6 text-[14.5px] leading-relaxed text-ink-secondary">
            Każdy wpis dzienniczka (<InlineCode>conversation</InlineCode>) może mieć max 6 zdjęć.
            Pliki trzymane w prywatnym bucketcie Supabase Storage{' '}
            <InlineCode>journal-photos</InlineCode>; RLS po <InlineCode>user_id</InlineCode>.
            Listing zdjęć dostajesz razem z <InlineCode>GET /api/journal</InlineCode> w polu{' '}
            <InlineCode>photos[]</InlineCode> (z świeżymi signed URL).
          </p>

          <h3 className="mt-8 mb-3 font-sans text-[18px] font-semibold text-ink-primary">
            Upload — 2 kroki
          </h3>
          <p className="mb-4 text-[13.5px] leading-relaxed text-ink-secondary">
            1. Wgraj plik bezpośrednio do Storage z klienta (Supabase JS / REST). Ścieżka musi
            zaczynać się od Twojego <InlineCode>user_id</InlineCode>:{' '}
            <InlineCode>{`{user_id}/{conversation_id}/{photo_id}.{ext}`}</InlineCode>.<br />
            2. Wywołaj endpoint poniżej żeby zapisać metadane (RLS sprawdzi że{' '}
            <InlineCode>conversation_id</InlineCode> należy do Ciebie).
          </p>

          <EndpointHeader method="POST" path="/api/journal-photos" />
          <h4 className="mt-6 mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">Body</h4>
          <div>
            <ParamRow name="conversationId" type="uuid" required>
              ID wpisu w dzienniczku.
            </ParamRow>
            <ParamRow name="storagePath" type="string" required>
              Ścieżka pliku w bucketcie. Musi zaczynać się od Twojego user_id.
            </ParamRow>
            <ParamRow name="mimeType" type='"image/jpeg" | "image/png" | "image/webp" | "image/heic" | "image/heif"' required>
              Typ pliku (whitelist).
            </ParamRow>
            <ParamRow name="sizeBytes" type="number" required>
              Rozmiar w bajtach. Max 10 MB.
            </ParamRow>
            <ParamRow name="originalName" type="string">
              Oryginalna nazwa pliku (opcjonalnie, do wyświetlenia).
            </ParamRow>
            <ParamRow name="width" type="number">
              Szerokość px (opcjonalnie, do aspect-ratio).
            </ParamRow>
            <ParamRow name="height" type="number">
              Wysokość px (opcjonalnie).
            </ParamRow>
          </div>
          <h4 className="mt-6 mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">Przykład</h4>
          <Code language="curl">{`curl -X POST "https://ostatnidzien.app/api/journal-photos" \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "conversationId": "fbd953bf-23f0-456c-94ce-102570d74f04",
    "storagePath": "5ede959c-.../fbd953bf-.../abc-photo.jpg",
    "mimeType": "image/jpeg",
    "sizeBytes": 245677
  }'`}</Code>
          <h4 className="mt-2 mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">Odpowiedź — 200</h4>
          <Code language="json">{`{
  "photo": {
    "id": "02c1f0d4-...",
    "conversationId": "fbd953bf-...",
    "storagePath": "5ede959c-.../fbd953bf-.../abc-photo.jpg",
    "mimeType": "image/jpeg",
    "sizeBytes": 245677,
    "width": null,
    "height": null,
    "position": 2,
    "createdAt": "2026-06-14T20:55:00.000Z",
    "signedUrl": "https://...supabase.co/storage/v1/object/sign/journal-photos/..."
  }
}`}</Code>
          <p className="mt-3 text-[13px] leading-relaxed text-ink-tertiary">
            Błędy: <InlineCode>400</InlineCode> bad_mime / bad_size,{' '}
            <InlineCode>403</InlineCode> bad_path (ścieżka poza Twoim folderem),{' '}
            <InlineCode>409</InlineCode> limit_reached (max 6 zdjęć).
          </p>

          <h3 className="mt-10 mb-3 font-sans text-[18px] font-semibold text-ink-primary">
            Usuń zdjęcie
          </h3>
          <p className="mb-4 text-[13px] text-ink-tertiary">
            Kasuje rekord z bazy i plik ze Storage. RLS: tylko własne.
          </p>
          <EndpointHeader method="DELETE" path="/api/journal-photos" />
          <h4 className="mt-6 mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">Query</h4>
          <div>
            <ParamRow name="id" type="uuid" required>
              ID rekordu zdjęcia.
            </ParamRow>
          </div>
          <h4 className="mt-6 mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">Przykład</h4>
          <Code language="curl">{`curl -X DELETE "https://ostatnidzien.app/api/journal-photos?id=02c1f0d4-..." \\
  -H "Authorization: Bearer $TOKEN"`}</Code>
          <h4 className="mt-2 mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-tertiary">Odpowiedź — 200</h4>
          <Code language="json">{`{ "ok": true }`}</Code>
        </section>
      </main>
    </div>
  )
}
