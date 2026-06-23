# Architektura — Ostatni Dzień

Dokument opisuje rzeczywisty stan kodu w repo `w1` (branch `main`, czerwiec 2026, po implementacji marketplace person z Tygodnia 4). Bazuje na plikach źródłowych, `package.json`, `vercel.json`, `.env.example` i kodzie w `api/`, `src/`, `scripts/`.

## 1. Przegląd systemu

Ostatni Dzień to webowa aplikacja (PWA-like, mobile-first) chroniąca użytkownika przed niechcianymi odnowieniami subskrypcji i pobraniami po triallach. Frontend to SPA w React 19 + Vite + Tailwind, hostowany na Vercel. Backend to zestaw bezstanowych funkcji Node na Vercel (`api/*.ts`) operujących na Supabase (Postgres + Auth + Storage + pgvector) — przechowuje subskrypcje użytkownika, dzienniczek rozmów, zdjęcia i entitlementy płatnych person AI.

Aplikacja zawiera **marketplace doradców AI**: darmowego domyślnego "Subskrypcika" oraz płatne persony ("Mecenas", "Ziomek") odblokowywane jednorazową płatnością przez **Stripe Payment Link**. Webhook `checkout.session.completed` jest jedynym źródłem prawdy o odblokowaniu — zapisuje entitlement do tabeli `user_personas` z weryfikacją podpisu i idempotencją. Aktywna persona steruje tonem i specjalizacją odpowiedzi w `/api/chat` i `/api/ask` (każda ma własny `system_prompt` w bazie). Wybrana Ścieżka monetyzacji: A — bez zewnętrznego e-commerce, katalog person + ceny + prompty żyją w Supabase, Stripe odpowiada tylko za przyjęcie pieniędzy.

Dodatkowo eksponowany jest serwer **MCP (Streamable HTTP)** pod `/api/mcp` z 7 toolami (CRUD subskrypcji, odczyt dzienniczka, zarządzanie aktywną personą), autoryzowany tym samym tokenem Supabase co REST.

## 2. Diagram architektury

```mermaid
flowchart LR
  subgraph Client[Przeglądarka — SPA React 19]
    UI[screens/ + components/]
    Z[zustand stores<br/>persist: localStorage]
    SB1[supabase-js<br/>auth + RLS]
  end

  subgraph Vercel[Vercel — serverless]
    REST[/api/subscriptions<br/>api/journal<br/>api/journal-photos/]
    CHAT[/api/chat — stream<br/>api/ask — one-shot]
    PERS[/api/personas<br/>api/personas/activate<br/>api/personas/checkout/]
    WH[/api/webhooks/stripe<br/>service-role/]
    MCP[/api/mcp<br/>MCP Streamable HTTP/]
    STATIC[SPA dist/ + rewrites]
  end

  subgraph Supabase
    PG[(Postgres + RLS<br/>subscriptions<br/>conversations<br/>conversation_photos<br/>chat_daily_usage<br/>personas<br/>user_personas<br/>user_settings<br/>pgvector)]
    AUTH[Auth — email/OTP]
    STO[(Storage bucket<br/>journal-photos)]
  end

  OAI[OpenAI<br/>gpt-4o-mini<br/>text-embedding-3-small]
  STRIPE[Stripe<br/>Payment Links + webhook]
  RES[Resend<br/>e-mail]
  EXT[MCP klient<br/>np. Claude Desktop]
  FS[FormSubmit.co<br/>feedback z UI]

  UI --> Z
  UI -->|REST + Bearer| REST
  UI -->|SSE-like stream| CHAT
  UI -->|REST + Bearer| PERS
  UI -->|signed URLs upload| STO
  UI --> SB1 --> AUTH
  PERS -->|redirect z client_reference_id| STRIPE
  STRIPE -->|checkout.session.completed| WH
  WH -->|service-role bypass RLS| PG
  REST --> PG
  CHAT --> PG
  CHAT --> OAI
  REST -. embed .-> OAI
  STATIC --> UI
  EXT -->|Bearer Supabase token| MCP --> PG
  UI -->|forms| FS
  REST -. opcjonalnie .-> RES
```

## 3. Komponenty

### Frontend (SPA)
| Moduł | Odpowiedzialność | Technologia |
|---|---|---|
| `src/App.tsx` | Routing (`/onboarding`, `/`, `/sub/:id`, plus `Docs`, `SignIn`), `AnimatePresence` fade+scale | react-router-dom v7, framer-motion |
| `src/screens/` | `Dashboard`, `Action`, `Onboarding`, `SignIn`, `Docs` | React 19 |
| `src/components/` | `ui/` (Button, Tag, Toast, ConfirmDialog, Toggle), `cards/` (SubCard, SubLogo), `charts/MiniChart`, `layout/` (PhoneFrame, StatusBar), `smartinput/` (SourceSheet→ProcessingScreen→AddForm→SuccessScreen), `chat/` (ChatSheet, JournalView, AskBar, ActionChips, WelcomeIntro), `editor/RichTextEditor` (Tiptap), `settings/`, `notifications/`, `docs/` (zakładki API + MCP) | Tailwind v3, framer-motion |
| `src/store/` | `subscriptions`, `onboarding`, `settings`, `notifications` — zustand + middleware `persist` w `localStorage` (klucze `ostatni-dzien-subs`, `ostatni-dzien-onboarding`) | zustand v5 |
| `src/lib/supabase.ts` | Klient Supabase z `persistSession + autoRefreshToken + detectSessionInUrl` | `@supabase/supabase-js` |
| `src/lib/auth.ts`, `components/AuthGate.tsx` | Bramka logowania + obsługa sesji | — |
| `src/lib/mappers.ts` | Mapowanie wiersz DB ↔ typ `Subscription` UI | — |
| `src/data/mock.ts`, `data/journal.ts` | Mock seed do pierwszego uruchomienia + fixtures | — |

### Backend (Vercel functions, runtime `nodejs`)
| Endpoint | Metoda | Odpowiedzialność |
|---|---|---|
| `api/subscriptions/index.ts` | `GET`, `POST` | Lista active+paused / dodanie nowej subskrypcji usera |
| `api/subscriptions/[id].ts` | `PATCH` | Zmiana statusu (`active` / `paused` / `cancelled`) |
| `api/chat.ts` | `POST` | Subskrypcik — agent czatu z tool-callami; streaming tokenów (`Transfer-Encoding: chunked`); model `gpt-4o-mini` (override `SUBSKRYPCIK_MODEL`); dzienny limit 20 wiadomości / user |
| `api/ask.ts` | `POST` | One-shot Q&A (bez streamingu, bez tooli mutujących) — wspólny licznik z `/api/chat` |
| `api/journal.ts` | `GET`, `POST` (`action="finalize"`) | Odczyt dzienniczka rozmów dla zakresu dat; finalizacja sesji ≥4 wiadomości → klasyfikacja + streszczenie LLM → insert do `conversations` + embedding |
| `api/journal-photos.ts` | `POST`, `DELETE` | Załączniki do wpisów dzienniczka (bucket `journal-photos`, max 6/wpis, ≤10 MB, JPEG/PNG/WEBP/HEIC) |
| `api/personas/index.ts` | `GET` | Katalog person (publiczna projekcja **bez `system_prompt`**) + lista `owned` + aktywna persona |
| `api/personas/activate.ts` | `POST` | Zmiana `active_persona_id` w `user_settings` po weryfikacji entitlementu (403 `not_owned` dla nie-kupionej) |
| `api/personas/checkout.ts` | `POST` | Zwraca URL Stripe Payment Linka wzbogacony o `client_reference_id=userId__personaId`. Klient redirektuje. |
| `api/webhooks/stripe.ts` | `POST` | Webhook Stripe (`checkout.session.completed`). Weryfikacja podpisu, raw-body, **service-role klient** (poza RLS). Idempotencja po unique index na `stripe_checkout_session_id`. Parsing `client_reference_id` rozdzielonego `__` → upsert do `user_personas`. |
| `api/mcp.ts` | `POST` MCP Streamable HTTP | Serwer MCP `name: 'ostatni-dzien' v0.1.0` z 7 toolami: `list_subscriptions`, `add_subscription`, `update_subscription_status`, `list_journal_entries`, **`list_personas`**, **`get_active_persona`**, **`change_active_persona`** |
| `api/_shared/auth.ts` | — | Walidacja Bearer = Supabase access token; zwraca klienta z RLS |
| `api/_shared/personas.ts` | — | `getActiveSystemPrompt()` — wywołuje RPC `get_active_persona_prompt()` (SECURITY DEFINER w DB) z fallbackiem do wbudowanego `SYSTEM_PROMPT` Subskrypcika. Używane przez `/api/chat` i `/api/ask`. |
| `api/_shared/rate-limit.ts` | — | `chat_daily_usage`, upsert na `(user_id, date)`, `DAILY_MESSAGE_LIMIT=20` |
| `api/_shared/embeddings.ts` | — | `text-embedding-3-small` (1536 dim), helpers `embedQuery`, `toPgVector`, batch po 96 |
| `api/_shared/categories.ts` | — | Taksonomia 7 kategorii (media_vod, audio_podcasts, design_creative, ai_tools, productivity_cloud, shopping_gaming, other) |
| `api/_shared/format.ts` | — | `formatSubDate`, `sectionFor` (Dziś/Ten tydzień/…), `urgencyFor` |
| `api/_shared/prompt.ts` | — | `SYSTEM_PROMPT` Subskrypcika jako fallback w `getActiveSystemPrompt` gdy DB niedostępna |
| `api/_market.ts` | — | Wbudowany katalog ofert rynkowych (Netflix, Spotify, …) do tool `get_market_offer` |

### Skrypty operacyjne (`scripts/`)
| Plik | Cel |
|---|---|
| `seed-demo-user.ts` | Idempotentny seed konta demo („Testuj aplikację") — subskrypcje + rozmowy + zdjęcia, używa `SUPABASE_SERVICE_ROLE_KEY` |
| `clone-to-demo-user.ts` | Klonowanie danych do usera demo |
| `seed-journal.ts` | Seed samego dzienniczka |

Uruchamiane lokalnie: `npx tsx scripts/<plik>.ts`.

## 4. Źródła danych

### Postgres (Supabase) — tabele wykryte w kodzie
| Tabela | Treść | Dostęp |
|---|---|---|
| `subscriptions` | `id, name, amount_pln, date, days_until, type, status, category, user_id` | RLS, czyt./pisane z `/api/subscriptions/*`, `/api/mcp`, `/api/chat` (tool-calls) |
| `conversations` | wpisy dzienniczka: `category, title, summary, started_at, ended_at`, embedding | `/api/journal`, `/api/mcp` (`list_journal_entries`) |
| `conversation_photos` | zdjęcia załączone do wpisu: `storage_path, mime_type, size_bytes, position, …` | `/api/journal-photos` (RLS) |
| `chat_daily_usage` | licznik wiadomości / user / dzień (UTC) — `(user_id, date) → message_count` | upsert w `rate-limit.ts` |
| `personas` | katalog doradców: `id, name, tagline, description, welcome_text, system_prompt, avatar_emoji, accent_color, price_pln_grosze, stripe_payment_link, is_free, sort_order, is_active`. **Kolumna `system_prompt` ma odebrane SELECT** dla ról `authenticated`/`anon` (column-level REVOKE) — chroniona własność intelektualna płatnych person. | RLS, SELECT publiczny dla authenticated (BEZ `system_prompt`); pisane tylko przez service_role |
| `user_personas` | entitlementy: `(user_id, persona_id)` PK, `source` (`free`/`stripe`/`manual`), `stripe_checkout_session_id` (unique index — idempotency key webhooka), `unlocked_at` | RLS: SELECT własnych. INSERT/UPDATE/DELETE **tylko przez service-role w webhooku** — brak polityk dla `authenticated` = brak way out z frontu. Trigger po `auth.users INSERT` seeduje `subskrypcik` z `source='free'`. |
| `user_settings` | dodana kolumna `active_persona_id text not null default 'subskrypcik'` z FK do `personas.id` | RLS owner-only — user ustawia swoją aktywną personę przez `/api/personas/activate` |

### Funkcje DB
- **`get_active_persona_prompt()`** — `SECURITY DEFINER`, omija RLS dla `SELECT system_prompt`, ale w środku łączy `user_settings` + `user_personas` + `personas` na `auth.uid()` — zwraca prompt tylko gdy user faktycznie ma entitlement. `GRANT EXECUTE` tylko dla `authenticated`. Defense-in-depth obok column-level REVOKE.

### Wektoryzacja
pgvector — wektory 1536-wymiarowe z OpenAI `text-embedding-3-small`, bez chunkowania (wpisy ≤ ~500 znaków). Używane do hybrydowego wyszukiwania w dzienniczku rozmów.

### Storage
Bucket **`journal-photos`** — pliki zdjęć dzienniczka; klient pobiera signed URLs (`createSignedUrls(..., 3600)`).

### LocalStorage (klient)
- `ostatni-dzien-subs` — zustand persist store subskrypcji (mock seed przy pierwszym uruchomieniu, gdy user niezalogowany).
- `ostatni-dzien-onboarding` — flaga `done`.
- `sessionStorage: open-adder-after-onboarding` — most między onboardingiem a Smart Inputem.

### Statyczne dane wbudowane
- `api/_market.ts` — auto-generowany katalog ofert (nazwa, plany cenowe PLN, metoda anulowania, alternatywy) używany przez tool `get_market_offer` w `/api/chat`.
- `src/data/mock.ts` — fixtures UI.

## 5. Integracje i połączenia

| Integracja | Kierunek | Uwierzytelnianie | Użycie |
|---|---|---|---|
| **Supabase Auth** | klient → Supabase | email/OTP, session token w `localStorage` (persistSession) | logowanie usera, sesja SPA |
| **Supabase PostgREST + RLS** | klient → Supabase (czytanie własnych danych); backend → Supabase (Bearer = user token) | Bearer `access_token` przekazywany z klienta do `api/*` przez nagłówek `Authorization`; RLS pilnuje że user widzi tylko swoje wiersze | wszystkie CRUDy |
| **Supabase Storage** | klient ↔ Supabase | ten sam token; signed URLs do odczytu | bucket `journal-photos` |
| **OpenAI API** | backend → OpenAI (out) | `OPENAI_API_KEY` (server-side, brak prefiksu `VITE_`) | `gpt-4o-mini` (chat, finalizacja dzienniczka); `text-embedding-3-small` (embeddingi) |
| **Stripe (Payment Links + Webhook)** | klient → Stripe (redirect z `client_reference_id`); Stripe → backend (`POST /api/webhooks/stripe`) z podpisem HMAC | `STRIPE_SECRET_KEY` (server-side, do API); `STRIPE_WEBHOOK_SECRET` (weryfikacja podpisu eventów). Webhook używa `SUPABASE_SERVICE_ROLE_KEY` żeby zapisać entitlement omijając RLS. | Sprzedaż person — Stripe sandbox/test mode, jednorazowa płatność. Stripe wysyła `checkout.session.completed`, webhook upsertuje do `user_personas` (idempotency po `stripe_checkout_session_id`). |
| **MCP server `ostatni-dzien` v0.1.0** | klient MCP (np. Claude Desktop) → `POST /api/mcp` | Bearer Supabase `access_token` (`withMcpAuth` → `authenticateToken`) | 7 toolów: `list_subscriptions`, `add_subscription`, `update_subscription_status`, `list_journal_entries`, `list_personas`, `get_active_persona`, `change_active_persona` |
| **Resend** | backend → Resend (out) | `resend` SDK, klucz z env [do weryfikacji — pakiet w `dependencies`, nazwa env nieujawniona w `.env.example`] | wysyłka e-maili (transactional) |
| **FormSubmit.co** | klient → FormSubmit (out) | brak — formularz HTML, adres odbiorcy zaszyty w `SettingsSheet.tsx` (`FEEDBACK_EMAIL`) | „Napisz do nas" z UI |
| **Vercel hosting + functions** | — | — | hosting SPA + runtime Node serverless |

### Tooling agenta w `/api/chat`
Function-calling OpenAI z toolami: `get_user_subscriptions`, `add_subscription`, `delete_subscription`, `change_subscription_status`, `get_market_offer`. Mutujące tooli wymagają zalogowanego usera (RLS).

## 6. Przepływ danych

**Logowanie i dane podstawowe.** User loguje się w `SignIn` przez Supabase Auth. Klient (`src/lib/supabase.ts`) trzyma sesję w `localStorage`. Po wejściu na `/` `Dashboard` pobiera subskrypcje (`GET /api/subscriptions` z Bearer). Niezalogowany user widzi mock z `src/data/mock.ts` przez zustand persist.

**Dodanie subskrypcji (Smart Input).** `SmartInputFlow` overlay: `SourceSheet` → fake OCR `ProcessingScreen` (3 s) → `AddForm` (pre-fill *celowo niedokładnymi* AI guessami, badge „AI" znika po edycji — human-in-the-loop) → `SuccessScreen`. Po potwierdzeniu: `POST /api/subscriptions` (lub bezpośrednio do store gdy gość).

**Czat z agentem (dynamiczna persona).** UI (`ChatSheet`) wysyła `POST /api/chat` z całą historią. Backend: auth → `checkAndIncrementDailyUsage` (limit 20/dzień) → **`getActiveSystemPrompt()`** woła RPC `get_active_persona_prompt()` w DB, która weryfikuje entitlement aktywnej persony usera i zwraca jej `system_prompt` (lub fallback do Subskrypcika gdy brak entitlementu/awaria DB) → OpenAI z dynamicznym promptem + tools. Pętla tool-call: model woła tool (np. `add_subscription`) → backend wykonuje na Supabase z RLS użytkownika → wynik wraca do modelu → finalne tokeny streamowane do klienta (chunked). Zmiana persony w `ChatSheet` w trakcie rozmowy: efekt na `activePersonaId` finalizuje sesję do dzienniczka i czyści okno czatu.

**Zakup persony (Marketplace).** User klika "Kup" w `PersonaDropdown` lub w karcie na `/store` → `POST /api/personas/checkout` zwraca URL Payment Linka z `client_reference_id=userId__personaId` → `window.location.assign` przekierowuje do Stripe Checkout (mobile-friendly). User płaci kartą `4242 4242 4242 4242` (test mode) → Stripe wysyła `checkout.session.completed` na `/api/webhooks/stripe` → weryfikacja podpisu → parsing `client_reference_id` (split na `__`) → upsert do `user_personas` z `source='stripe'` i `stripe_checkout_session_id` (unique). Stripe redirektuje usera na `success_url`: `/store?purchased=<personaId>` → `Store.tsx` poll-uje `/api/personas` 4× co 1.5 s (na wypadek opóźnienia webhooka) → pokazuje toast "Odblokowano: …" i odświeża listę.

**Aktywacja persony.** Klik wiersza w dropdownie (gdy `isOwned && !isActive`) → `POST /api/personas/activate` z `{personaId}` → walidacja entitlementu pod RLS (`user_personas` SELECT pod userem) → upsert `user_settings.active_persona_id`. Dropdown automatycznie zamyka się, `ChatSheet` czyści wiadomości i ładuje nową personę przy następnej wymianie.

**Dzienniczek rozmów.** Po zakończeniu sesji czatu (≥4 wiadomości) frontend woła `POST /api/journal` z `action="finalize"`. Backend prosi LLM o JSON `{category, title, summary}`, liczy embedding, INSERT do `conversations`. Krótsze sesje są pomijane (gating). Zdjęcia: klient uploaduje do bucketu `journal-photos`, potem `POST /api/journal-photos` z metadanymi; `DELETE` kasuje rekord + plik.

**MCP (długoterminowa pamięć / integracje zewnętrzne).** Klient MCP łączy się do `/api/mcp` z Bearer = Supabase token. `mcp-handler` + `withMcpAuth` waliduje token, rejestrowane są 4 toole — operują na tych samych tabelach co REST, z tą samą RLS.

**Bramki human-in-the-loop:** (1) korekta AI guessów w `AddForm`; (2) `ConfirmDialog` przy „Usuń z listy" (rozróżnienie usunięcia z appki vs anulowania usługi); (3) na ekranie akcji primary CTA „Anuluj w [X]" otwiera deep link / instrukcję — user wykonuje sam.

## 7. Hosting i deployment

- **Vercel** (`vercel.json`): framework `vite`, `buildCommand: npm run build`, `outputDirectory: dist`. Rewrite `"/((?!api/).*)" → /index.html` (SPA history fallback; `/api/*` trafia do funkcji serverless).
- **Build**: `tsc -b && vite build`. Wymóg: Node 20+ (README).
- **Funkcje serverless** w `api/` — runtime `nodejs` (eksport `export const config = { runtime: 'nodejs' }` w `api/mcp.ts`; reszta funkcji to `@vercel/node` handlery).
- **Lokalny dev**: `npm run dev` → Vite na `:5173`; node z `nvm` (workaround w `.claude/launch.json` — patrz `CLAUDE.md §10.1`).
- **Skrypty seedujące** uruchamiane ręcznie z lokalnej maszyny (`npx tsx scripts/...`), wymagają `SUPABASE_SERVICE_ROLE_KEY`.
- **Brak crona, tmux, dockera, kolejek.** Nie znaleziono `Dockerfile`, `docker-compose.yml`, ani plików `vercel.json#crons`.

### Zmienne środowiskowe (nazwy i rola — bez wartości)
| Nazwa | Strona | Rola |
|---|---|---|
| `VITE_SUPABASE_URL` | klient | URL projektu Supabase |
| `VITE_SUPABASE_ANON_KEY` | klient | publishable / anon key Supabase |
| `SUPABASE_URL` | server (Vercel) | URL projektu (fallback: `VITE_SUPABASE_URL`) |
| `SUPABASE_ANON_KEY` | server | anon key dla `authenticateToken` (fallback: `VITE_SUPABASE_ANON_KEY`) |
| `OPENAI_API_KEY` | server | klucz OpenAI (chat + embeddingi) |
| `SUBSKRYPCIK_MODEL` | server, opcjonalnie | nadpisanie modelu czatu (domyślnie `gpt-4o-mini`) |
| `SUBSKRYPCIK_SUMMARY_MODEL` | server, opcjonalnie | model summarizera dzienniczka |
| `OPENAI_EMBED_MODEL` | server, opcjonalnie | model embeddingów |
| `STRIPE_SECRET_KEY` | server (webhook + checkout) | klucz Stripe API (test/live mode) — używany przez SDK do `constructEvent` w webhooku |
| `STRIPE_WEBHOOK_SECRET` | server (`/api/webhooks/stripe`) | sekret do weryfikacji podpisu HMAC eventów Stripe; rotowalny w Stripe Dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | server (`/api/webhooks/stripe`) + skrypty seedujące | bypass RLS dla zapisu entitlementów po pomyślnej płatności (webhook nie ma sesji usera) oraz dla seedów demo |

## 8. Bezpieczeństwo — audyt po Tygodniu 4

| Klasa | Stan | Mechanizm |
|---|---|---|
| Wyciek `system_prompt` z konsoli | ✅ Zablokowane | Kolumnowe `REVOKE SELECT (system_prompt) ON personas FROM authenticated, anon` + `GRANT SELECT` explicitnie na bezpieczne kolumny. Prompt dostępny tylko przez `SECURITY DEFINER` RPC po weryfikacji entitlementu. |
| Sfabrykowany webhook | ✅ Zablokowane | `stripe.webhooks.constructEvent` z `STRIPE_WEBHOOK_SECRET`. Bez podpisu → 400. |
| Privilege escalation entitlementów | ✅ Zablokowane | `user_personas` ma RLS tylko `SELECT own` — brak polityk INSERT/UPDATE/DELETE dla `authenticated`. Tylko service-role w webhooku może pisać. |
| Aktywacja niezakupionej persony | ✅ Zablokowane | `/api/personas/activate` waliduje entitlement (403 `not_owned`). Nawet gdy user sam zmieni `user_settings.active_persona_id` przez supabase-js (RLS pozwala), `getActiveSystemPrompt` zwraca fallback do Subskrypcika — defense-in-depth. |
| Idempotencja webhooka | ✅ | Unique index na `user_personas.stripe_checkout_session_id`. Stripe retry = no-op. |
| CSRF | ✅ N/A | Bearer token w `Authorization`, nie cookies — cross-origin nie doda nagłówka. |
| SQL Injection | ✅ N/A | Wszystko przez Supabase JS SDK (parametryzowane). |
| Rate limit czatu | ✅ | 20 wiadomości/user/dzień (`chat_daily_usage`). |

## 9. Otwarte pytania / TODO

- **Content-Security-Policy** w `vercel.json` — jeszcze nie ustawione. Dodać przed prawdziwym live mode (mitygacja XSS na JWT w localStorage).
- **Alert na "missing identifiers" w webhooku** — gdy user zapłaci a `client_reference_id` jest niesformatowany, webhook obecnie loguje + 200 bez działania. Dodać Resend mail-alert do admina (Resend już jest w deps).
- **Webhook secret rotation** — w Stripe Dashboard ustawić politykę rotacji `STRIPE_WEBHOOK_SECRET` (90 dni) przed prze­łączeniem na live.
- **Resend** — pakiet jest w `dependencies`, ale w przejrzanym kodzie `api/*` nie znaleziono call-site'u; nazwa env (np. `RESEND_API_KEY`) nieujawniona w `.env.example`. [do weryfikacji]
- **`FEEDBACK_EMAIL`** w `SettingsSheet.tsx` — zaszyty na sztywno; brak rotacji. [świadoma decyzja vs. TODO]
- Brak testów automatycznych — weryfikacja wyłącznie wizualna przez Vite preview (CLAUDE.md §10.9) oraz E2E z Supabase MCP (sym. webhooka SQL-em).
