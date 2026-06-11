# PRD — Subskrypcik (AI Doradca Subskrypcji)

**Status:** Draft v1 · **Owner:** Krzysztof · **Data:** 2026-06-11
**Faza projektu:** Phase 16 (po Supabase auth + cloud persist)

---

## 1. Problem i cel

### Problem
Użytkownik "Ostatniego Dnia" widzi listę subskrypcji i daty pobrań, ale **nie wie**:
- Czy płaci za dużo (czy istnieje tańszy plan / promocja / pakiet)?
- Jak konkretnie anulować daną usługę (procedura, okres wypowiedzenia, deep linki)?
- Które subskrypcje się dublują funkcjonalnie (np. Netflix + Disney+ + HBO).
- Co najbardziej "boli" w jego portfolio (najdroższe / najrzadziej używane / źle dopasowane).

### Cel produktowy
Dać użytkownikowi **konkretnego, zwięzłego doradcę w czacie**, który zna jego subskrypcje + bazę popularnych usług, i odpowiada liczbami + jednym CTA. Bez gadania.

### Sukces MVP (mierzymy)
- ≥30% userów po dodaniu ≥3 subskrypcji otwiera czat w ciągu 7 dni.
- ≥50% rozmów kończy się ≥3 wiadomościami (user-AI-user-AI…).
- ≥1 udokumentowany przypadek użytkownika, który po rozmowie anulował / zmienił plan (potwierdzone w wywiadach).

---

## 2. Scope MVP

### IN
- Bottom Ask Bar + FAB (asymmetric layout, blur pill 75% / 25%).
- Chat Bottom Sheet z historią **tylko bieżącej sesji** (reset po zamknięciu).
- 3-5 statycznych Action Chips ponad Ask Barem.
- Agent **read-only** nad listą subskrypcji usera (tool `get_user_subscriptions`).
- Ręcznie kurowana baza JSON ~50 popularnych usług w PL (tool `get_market_offer`).
- Streaming odpowiedzi z renderingiem Markdown.
- Hard limit: **20 wiadomości / user / dzień** (licznik w Supabase).
- Backend: Vercel Serverless Function (`/api/chat`) + OpenAI SDK.
- Model: **gpt-4o-mini** (koszt/jakość MVP); upgrade do `gpt-4o` przez env flag.

### OUT (świadomie odpuszczone w MVP)
- Persystencja historii rozmów (sesja tylko).
- Akcje zapisu (agent nie edytuje listy).
- Kontekstowe chips generowane z listy usera.
- Web search / real-time prices.
- Voice input.
- Multi-turn agent z złożoną orkiestracją (1 model + 2 tools wystarczy).

---

## 3. Persony i tone-of-voice

### Subskrypcik (system prompt)
- **Konkretny, profesjonalny, zwięzły.**
- **Zero powitań, zero "chętnie pomogę", zero przeprosin.**
- Od pierwszego słowa: fakty, liczby, kwoty w PLN.
- Każda odpowiedź kończy się **jednym CTA jako pytanie** ("Czy chcesz X?").
- Formatowanie: **bold** dla kwot/liczb, listy dla porównań, **nigdy nie wymyśla cen** — jeśli nie ma w bazie/kontekście, mówi "nie mam aktualnych danych dla X".

### Few-shot (do system prompta)
```
U: "Jak zrezygnować ze Zdrofitu?"
AI: "Zdrofit wymaga **miesięcznego okresu wypowiedzenia** ze skutkiem na koniec miesiąca
kalendarzowego. Rezygnując dzisiaj, zapłacisz za kolejny pełny miesiąc. Najbezpieczniej złożyć
wypowiedzenie przez portal klienta — rezygnacje mailowe są procesowane z opóźnieniem.
Podać link do formularza wypowiedzenia w Twoim panelu?"

U: "Ile wydaję miesięcznie?"
AI: "Twoje 8 aktywnych subskrypcji to **434,96 zł/mies.** (5219,52 zł/rok). Trzy największe
pozycje: **Adobe CC (89,99 zł)**, **Netflix (67 zł)**, **Spotify Family (29,99 zł)** = 43%
budżetu. Rozbić Adobe na alternatywy?"
```

---

## 4. Architektura

```
┌─────────────────────────────────────────────────────┐
│  Client (React + zustand)                           │
│  - <AskBar /> + <FAB /> (asymmetric layout)         │
│  - <ChatSheet /> (bottom sheet, framer-motion)      │
│  - <ActionChips /> (5 statycznych promptów)         │
│  - fetch stream → /api/chat (SSE)                   │
└──────────────────────┬──────────────────────────────┘
                       │ POST {messages, userId}
                       ▼
┌─────────────────────────────────────────────────────┐
│  Vercel Serverless Function /api/chat               │
│  1. Auth check (Supabase JWT z headera)             │
│  2. Rate limit check (Supabase: daily_usage table)  │
│  3. OpenAI Agents SDK call (gpt-4o-mini, streaming) │
│     Tools:                                          │
│       - get_user_subscriptions(userId)              │
│       - get_market_offer(serviceName)               │
│  4. Stream tokens → client                          │
│  5. Inkrementacja licznika usage                    │
└──────────────────────┬──────────────────────────────┘
                       │
            ┌──────────┴──────────┐
            ▼                     ▼
   ┌────────────────┐    ┌──────────────────┐
   │ Supabase       │    │ data/market.json │
   │ - subscriptions│    │ - 50 usług PL    │
   │ - daily_usage  │    │ - plany, ceny    │
   │   (new table)  │    │ - jak anulować   │
   └────────────────┘    └──────────────────┘
```

### Nowa tabela Supabase: `chat_daily_usage`
```sql
create table chat_daily_usage (
  user_id uuid references auth.users(id) on delete cascade,
  date date not null,
  message_count int default 0,
  primary key (user_id, date)
);
-- RLS: user widzi tylko swój rekord
```

### Baza rynkowa (`src/data/market.json`)
Format na 1 usługę:
```json
{
  "id": "netflix",
  "name": "Netflix",
  "category": "VOD",
  "plans": [
    { "name": "Standard z reklamami", "price": 29.99, "currency": "PLN", "period": "month" },
    { "name": "Standard", "price": 57, "currency": "PLN", "period": "month" },
    { "name": "Premium", "price": 77, "currency": "PLN", "period": "month" }
  ],
  "cancellation": {
    "method": "self-service",
    "url": "https://www.netflix.com/cancelplan",
    "notice_period_days": 0,
    "notes": "Anulowanie natychmiastowe, dostęp do końca opłaconego okresu."
  },
  "alternatives": ["disney_plus", "hbo_max", "skyshowtime"]
}
```

**Lista MVP (~50 usług):** Netflix, Disney+, HBO Max, SkyShowtime, Apple TV+, Spotify, Apple Music, Tidal, YouTube Premium, Adobe CC (wszystkie plany), Canva Pro, Figma, Notion, ChatGPT Plus, Claude Pro, GitHub Copilot, Microsoft 365, iCloud+, Google One, Dropbox, Audible, Storytel, Legimi, Empik Go, Player, CDA Premium, Polsat Box Go, Eleven Sports, Zdrofit, Calypso, Medicover Sport, OK System, Multisport, Allegro Smart!, Amazon Prime, Lego Insiders, Strava, Peloton, Duolingo Super, Babbel, Brain.fm, Headspace, Calm, 1Password, NordVPN, Surfshark, ProtonMail, Vinted Pro, Wolt+, Bolt Food.

---

## 5. UI/UX — szczegóły

### 5.1 Asymmetric Bottom Layout
- **Ask Bar:** `width: 75%`, `height: 52px` (1 wiersz), `border-radius: 999px`, `backdrop-filter: blur(20px)`, `background: rgba(255,255,255,0.7)`, `box-shadow: 0 4px 16px rgba(13,31,26,0.08)`.
  - Ikona: `Sparkles` z lucide, 1.5px stroke, `text-accent`, 20px, padding-left 18px.
  - Placeholder: `"Zapytaj Subskrypcika o oszczędności..."`, font Geist 14px, `text-ink-tertiary`.
  - Disabled send button (strzałka w górę) po prawej, pojawia się gdy `value.length > 0`.
- **FAB:** `width: 56px height: 56px`, `border-radius: 50%`, `background: var(--accent)`, ikona `Plus` biała 24px, `box-shadow: 0 6px 20px rgba(31,61,51,0.35)`.
- **Gap między nimi:** 12px. Container: `position: fixed; bottom: env(safe-area-inset-bottom, 16px) + 16px; padding: 0 16px;`.

### 5.2 Dynamic Text Area
- `<textarea>` z `rows={1}`, `resize: none`, `overflow: hidden`.
- `onInput`: `el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, MAX_HEIGHT) + 'px'`.
- `MAX_HEIGHT = 4 * lineHeight ≈ 96px`.
- Po przekroczeniu → `overflow-y: auto`.
- Po wysłaniu: `value=''`, `height=auto`, focus zostaje.

### 5.3 Chat Bottom Sheet
- Trigger: focus na Ask Bar **lub** kliknięcie chip.
- Animacja: `framer-motion` slide-up od dołu, 220ms, easing `cubic-bezier(0.32, 0.72, 0, 1)` (zgodnie z CLAUDE.md §10.6).
- Sheet zajmuje `85vh`, drag-to-dismiss (handle 36px na górze).
- Wewnątrz: scrollowalna lista wiadomości (user dymek po prawej `bg-accent-soft`, AI po lewej `bg-bg-card border-hairline`), Ask Bar przypięty na dole sheeta nad klawiaturą (`position: sticky; bottom: 0`).
- Action Chips: poziomy scroll nad Ask Barem **tylko gdy historia pusta**; znikają po pierwszej wiadomości.

### 5.4 Loading state
- Po wysłaniu: pod ostatnią wiadomością user pojawia się **skeleton bubble** (3 pulsujące prostokąty, animacja `processing-dots` z `globals.css`).
- Streaming: tokeny dolatują, skeleton znika gdy przyjdzie pierwszy chunk.

### 5.5 Markdown rendering
- Lib: `react-markdown` + `remark-gfm`.
- Custom renderery: linki w `text-accent underline`, listy z `pl-4`, `<strong>` w `text-ink-primary font-semibold`.

### 5.6 Stany błędów
| Stan | UI |
|---|---|
| Brak internetu | Toast: "Brak połączenia. Spróbuj ponownie." |
| Rate limit (20/dzień) | AI bubble: "Wykorzystałeś dzienny limit pytań. Wrócę jutro." + disabled input |
| OpenAI error | AI bubble: "Coś poszło nie tak. Spróbuj za chwilę." + retry button |
| Pusty input | Send button disabled (nie wysyła) |

---

## 6. Agent — szczegóły techniczne

### System prompt (skrót)
```
Jesteś Subskrypcik — doradca subskrypcji w aplikacji "Ostatni Dzień".

ZASADY:
1. NIGDY nie zaczynaj od powitania, "chętnie", "oczywiście", "rozumiem".
2. Pierwsze słowo = fakt lub liczba.
3. Kwoty w PLN, pogrubione bold.
4. Każda odpowiedź kończy się JEDNYM pytaniem-CTA.
5. Jeśli nie znasz danych (brak w market_offer) — powiedz wprost: "Nie mam aktualnych danych
   dla [X]." NIE wymyślaj cen.
6. Maks 4 zdania per odpowiedź, chyba że user prosi o porównanie/listę.
7. Używaj narzędzi PROAKTYWNIE: gdy user pyta o swoje subskrypcje → get_user_subscriptions.
   Gdy pyta o usługę z rynku → get_market_offer.

KONTEKST:
- Użytkownik ma dostęp tylko do swojej listy subskrypcji.
- Nie możesz nic dodać/usunąć/edytować — tylko doradzasz.
- Język: polski.
```

### Tools (OpenAI function calling)
```ts
// 1. get_user_subscriptions
{
  name: "get_user_subscriptions",
  description: "Zwraca listę aktywnych subskrypcji użytkownika z bazy.",
  parameters: {} // userId wstrzykiwany server-side, agent nie widzi
}
// returns: [{ name, amount, currency, nextChargeDate, type: 'trial'|'renewal' }]

// 2. get_market_offer
{
  name: "get_market_offer",
  description: "Zwraca plany cenowe, sposób anulowania i alternatywy dla danej usługi.",
  parameters: {
    type: "object",
    properties: {
      serviceName: { type: "string", description: "Nazwa usługi, np. 'Netflix', 'Spotify'" }
    },
    required: ["serviceName"]
  }
}
// returns: cały rekord z market.json + null jeśli brak
```

### Pre-fetch context injection
Przy pierwszej wiadomości w sesji, do `messages` dokładamy system message:
```
Aktualna data: 2026-06-11.
Lista subskrypcji użytkownika (snapshot):
- Netflix · 67,00 zł · odnowienie · 2026-06-14
- Adobe CC · 89,99 zł · odnowienie · 2026-06-20
... (max 20 pozycji)
Suma miesięczna: 434,96 zł.
```
To oszczędza tool call dla najczęstszych pytań ("ile wydaję?").

---

## 7. Action Chips (statyczne MVP)
1. **"Ile wydaję miesięcznie?"**
2. **"Co dubluje się w mojej liście?"**
3. **"Najtańsze alternatywy do Netflix"**
4. **"Jak anulować siłownię?"**
5. **"Co odnowi się w tym tygodniu?"**

---

## 8. Bezpieczeństwo i koszty

| Ryzyko | Mitygacja |
|---|---|
| Wyciek klucza OpenAI | Klucz tylko w env vars Vercel, nigdy w bundle |
| Spam / abuse | Hard limit 20 msg/user/dzień + Supabase JWT required |
| Prompt injection | System prompt na końcu messages; user input nigdy nie wpływa na tool params bezpośrednio (sanityzacja `serviceName` — only alphanumeric + spacja) |
| Halucynacja cen | System prompt eksplicytnie zakazuje wymyślania + tool zwraca null gdy brak danych |
| Koszty | gpt-4o-mini (~$0.15/1M input, $0.60/1M output). Średnia rozmowa ~2k tokens = $0.001. 1000 userów × 5 rozmów/dzień = $5/dzień. Globalny cap na poziomie OpenAI dashboard ($50/mies. dla MVP). |

---

## 9. Plan implementacji (Faza 16)

**Branch:** `phase-16-subskrypcik`

| Krok | Co | Czas |
|---|---|---|
| 16.1 | Baza `market.json` (10 usług na start, reszta iteracyjnie) | 2h |
| 16.2 | Migracja Supabase: `chat_daily_usage` + RLS | 30min |
| 16.3 | `/api/chat.ts` — Vercel function, OpenAI streaming, 2 tools, rate limit | 4h |
| 16.4 | `<AskBar />` + `<FAB />` — refactor obecnego FAB do asymmetric layout | 2h |
| 16.5 | `<ChatSheet />` — bottom sheet, framer-motion, markdown rendering | 4h |
| 16.6 | `<ActionChips />` + integracja | 1h |
| 16.7 | Streaming na froncie (SSE / fetch ReadableStream) | 2h |
| 16.8 | Stany błędów, rate limit UI, polish | 2h |
| 16.9 | Test E2E manualny + screenshoty + merge | 2h |

**Razem:** ~20h pracy. Realistycznie 3-4 sesje Claude Code.

---

## 10. Otwarte pytania (do v2)

- Persystencja historii (Supabase tabela `chat_messages` + RLS).
- Kontekstowe chips generowane z listy.
- Tool `propose_action` (read+propose) — agent sugeruje "usuń Netflix?" z przyciskiem potwierdzenia w bubble.
- Web search fallback dla usług spoza market.json.
- Voice input (Whisper API).
- Eksport rozmowy do PDF / share.

---

*Ten PRD jest source of truth dla Fazy 16. Aktualizuj po decyzjach z implementacji.*
