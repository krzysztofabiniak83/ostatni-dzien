# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# CLAUDE.md — Ostatni Dzień

Ten plik daje Ci pełny kontekst projektu. Przeczytaj go w całości przed pierwszą akcją.
**Sekcje 1–9 = brief produktowy/designerski (decyzje). Sekcja 10 = referencja kodu** (architektura, komendy, konwencje) — tam najszybciej zorientujesz się w istniejącej bazie React.

---

## 1. Produkt

**Nazwa robocza:** Ostatni Dzień
**Co to robi:** Mobilna aplikacja chroniąca użytkowników przed niechcianymi opłatami za zapomniane okresy próbne i automatycznie odnawiane subskrypcje.
**Status:** Wczesny MVP. Prototypy klikalne (HTML) są ukończone dla 3 głównych ekranów.
**Język UI:** Polski. Komunikacja z użytkownikiem (devem) też po polsku.

### Główna hipoteza
Ludzie zapominają o trialach. Automatyczne odnowienia są drogie. Aplikacja, która pokazuje dokładnie ile dni zostało do następnego pobrania i daje jednoklikowe anulowanie, rozwiązuje realny problem finansowy.

### Trzy filary MVP
1. **Dashboard** — chronologiczna lista nadchodzących pobrań z licznikiem dni
2. **Smart Input** — bezbolesne dodawanie subskrypcji (screenshot → fake OCR → formularz potwierdzenia)
3. **Ekran akcji** — szczegóły + przycisk anulowania (deep link tam gdzie się da, instrukcja tam gdzie się nie da)

---

## 2. Decyzje produktowe (już podjęte, nie wracaj do nich bez pytania)

| Decyzja | Wybór |
|---|---|
| Reprezentacja pilności | Lista chronologiczna z licznikiem dni |
| Trial vs odnowienie | Wizualnie mocno rozróżnione |
| OCR w MVP | **Udawany** — pokazujemy loader + formularz z "AI guesses" do korekty |
| Ekran akcji — anulowanie | Mix: deep link tam gdzie się da, instrukcja tam gdzie się nie da |
| Kierunek wizualny | Calm/minimal, editorial |
| Kolor akcentu | Ciemna zieleń (spokój, pieniądze) |
| Pierwszy ekran | Onboarding z dodaniem pierwszej subskrypcji |
| Hero stat na dashboardzie | "8 subskrypcji" mniejsze + "434,96 zł" duże, bold, kursywa, zielone |
| Podział sekcji | Dziś / Ten tydzień / Ten miesiąc / Później |
| Krytyczny ekran akcji (≤3 dni z trial) | Pełen ekran z dramatycznym licznikiem, terracottowe tło, badge "Uwaga" pulsujący |
| CTA na ekranie akcji | "Anuluj w [X]" (primary) + "Pokaż instrukcję" (secondary) — równorzędne wizualnie, ale primary dominuje weightem |
| Dodatkowe info na ekranie akcji | Mini-wykres ostatnich 6 miesięcy (pusty dla triali z notką) |
| "Usuń z listy" | Z potwierdzeniem dialogu, edukacyjnym tekstem rozróżniającym "usuń z appki" od "anuluj usługę" |
| "Oznacz jako anulowane ręcznie" | **Nie w MVP** |
| Przejścia między ekranami | Fade + scale (cubic-bezier 0.32, 0.72, 0, 1) |
| Bottom sheet źródła dodawania | Slajduje od dołu, 3 opcje (screenshot/email/manual) |
| Kolejność opcji w bottom sheecie | 1. Screenshot (primary) 2. Email 3. Manual |
| Stan przetwarzania OCR | Skanująca linia po fake screenshocie + glow (3 sek) |
| Formularz po OCR | Wypełniony **celowo niedokładnymi** AI guesses — user koryguje |
| Pola formularza w MVP | Nazwa, Kwota, Data pobrania, Typ (trial/odnowienie) |
| Po zapisaniu | Sukces fullscreen z animacją + "Zobacz na liście" |
| Upload screenshota | Systemowy picker (jak w produkcji) |
| Branding "AI" | Tylko subtelnie — glow podczas skanowania, badge "AI" przy polach |

---

## 3. Design System (Faza 0 ukończona)

### Kolory (CSS vars)
```css
--bg-base: #F5F3EE;        /* off-white, ciepły bone, tło aplikacji */
--bg-card: #FFFFFF;        /* karty */
--bg-subtle: #EDEAE3;      /* subtelne tła sekcji */
--ink-primary: #0D1F1A;    /* tekst główny — bardzo ciemna zieleń */
--ink-secondary: #5C6661;  /* tekst drugorzędny */
--ink-tertiary: #9AA09C;   /* tekst pomocniczy, labelki */
--accent: #1F3D33;         /* deep forest green — primary CTA, akcent */
--accent-hover: #2A5444;
--accent-soft: #E8EEEB;    /* tło akcentu, badges */
--alert: #B85C3C;          /* terracotta — stan krytyczny (≤3 dni) */
--alert-soft: #F5E4DC;
--alert-bg: #FAF1EC;       /* tło ekranu krytycznego */
--hairline: #E0DDD5;       /* borders, dividery */
```

### Typografia
- **Display / liczniki / nagłówki**: **Fraunces** (Google Fonts, opsz 9-144, weights 300-600, regular + italic)
- **UI / body**: **Geist** (Google Fonts, weights 300-700)
- **Mono / labelki / eyebrows**: **Geist Mono** (weights 400-500)

Hierarchia (z designu):
- Display XL: Fraunces 300, 88-112px (countdown krytyczny)
- Display: Fraunces 400, 48-52px (licznik dni na karcie)
- H1: Fraunces 400, 30-32px (tytuł ekranu)
- H2: Geist 600, 20px
- Body: Geist 400, 15px
- Meta: Geist 500, 13px (drugorzędny)
- Mono: Geist Mono 400-500, 10-12px, letter-spacing 0.12-0.14em, uppercase (eyebrows, labelki)

### Spacing (4-base)
```
s-1: 4px,  s-2: 8px,  s-3: 12px, s-4: 16px,
s-5: 24px, s-6: 32px, s-7: 48px, s-8: 64px
```

### Border radius
- 8px (r-sm) — tagi
- 12px (r-md) — pola formularza, buttony
- 16px (r-lg) — karty
- 24px (r-xl) — modale, bottom sheet
- 999px (pill) — tagi pill, kółka

### Komponenty atomowe (już zaprojektowane)
- **Button**: primary (zielony fill), secondary (outline), tertiary (text link), critical-cta (terracotta fill, tylko w stanie krytycznym)
- **Tag**: trial (fill zielony), renewal (outline), critical (terracotta soft bg)
- **Card subskrypcji**: 3 kolumny (licznik dni | info | logo), wariant critical (left border terracotta), wariant today (gradient bg + pulsujący badge "Uwaga")
- **Field input**: label mono + input z fokus borderem zielonym
- **Type toggle**: 2-segmentowy switcher (trial/renewal)
- **AI badge**: mały pill w polu wskazujący że to AI guess — znika po edycji
- **Mini-chart**: 6 słupków, ostatni miesiąc highlighted (var(--accent))

---

## 4. Stack techniczny

**Wybrany:** Vite + React + TypeScript + Tailwind CSS

**Dodatkowe biblioteki (do dodania w Fazie 1):**
- `framer-motion` — animacje (fade+scale przejścia, scan line, success check)
- `react-router-dom` — nawigacja między ekranami
- `zustand` — state subskrypcji (lekki, bez boilerplate)
- `clsx` lub `tailwind-merge` — łączenie klas warunkowo
- `lucide-react` — ikony (mamy je już w prototypach)

**Persistencja w MVP:** `localStorage` przez middleware zustand (`persist`). Backend w iteracji 2.

**Deployment:** Vercel (link `vercel` w terminalu po połączeniu z GitHub).

---

## 5. Tone & komunikacja

**User to non-deweloper produktowy.** Komunikuj się tak:
- **Polski w komunikacji** (kod, nazwy komponentów, commit messages — angielski).
- **Krótko i konkretnie.** Bez waty.
- **Pytaj z opcjami do wyboru** kiedy potrzebujesz decyzji. Nie zadawaj pytań otwartych typu "co preferujesz". Daj 2-4 opcje.
- **Po każdym ważnym kroku** — krótka rekapitulacja co zostało zrobione i co dalej.
- **Pokazuj efekty wizualnie** — uruchamiaj dev server, daj URL do oglądania, screenshot description.
- **Decyzje produktowe** — sprawdź najpierw tabelę w sekcji 2. Jeśli czegoś tam nie ma, zapytaj usera. Nie zgaduj.
- **Nie nadużywaj formatowania** — listy i bullet pointy tylko gdy faktycznie potrzebne.

---

## 6. Jak prowadzić projekt

1. **Każdą fazę kończ commitem z sensowną wiadomością** (`feat: dashboard MVP with 4-section list`).
2. **Branch dla każdej fazy** — `phase-1-dashboard`, `phase-2-action-screen` itd. Merge do `main` po walidacji.
3. **Po każdej fazie zapytaj user przed merge** — daj mu link/screenshot do obejrzenia.
4. **Iteruj na podstawie feedbacku.** User często prosi o drobne poprawki typograficzne, kolorowe — implementuj szybko, nie filozofuj.
5. **Nie buduj funkcji niezdefiniowanych w PROJECT_PLAN.md** bez pytania. Skupiamy się na MVP.

---

## 7. Co już istnieje (referencja wizualna)

User ma 4 pliki HTML z prototypami klikalnymi:
- `ostatni-dzien-design-system.html` — Faza 0 (tokeny i komponenty)
- `ostatni-dzien-dashboard.html` — wczesny Dashboard
- `ostatni-dzien-faza-2.html` — Dashboard + ekran akcji
- `ostatni-dzien-faza-3.html` — pełen flow Smart Input

**Gdy zaczynasz Fazę 1 React** — poproś usera o wklejenie zawartości tych plików do projektu jako `references/` (gitignored). Mają być źródłem prawdy wizualnej dla każdego komponentu — co do pixela.

---

## 8. Anti-patterns (czego NIE robić)

- ❌ Nie używaj Inter/Roboto/system-ui jako fontów. Tylko Fraunces + Geist + Geist Mono.
- ❌ Nie wprowadzaj kolorów spoza palety bez pytania.
- ❌ Nie dodawaj fioletowych gradientów ani "modern AI aesthetics". Calm minimal, editorial.
- ❌ Nie używaj emoji w UI produkcyjnym (w toast OK).
- ❌ Nie buduj formularzy z natywnym `<form>` w React — handle przez useState/zustand.
- ❌ Nie podłączaj prawdziwego OCR. To MVP — fake OCR jest celowy.
- ❌ Nie ignoruj `prefers-reduced-motion` w animacjach.

---

## 9. Quick-start dla nowej sesji Claude Code

Gdy user otworzy nową sesję, Twoje pierwsze akcje:
1. `cat CLAUDE.md` — przeczytaj ten plik
2. `cat PROJECT_PLAN.md` — sprawdź na jakim etapie jesteśmy
3. `git status && git log --oneline -10` — zobacz co już zrobiono
4. Powitaj usera krótko, powiedz na czym jesteśmy, zaproponuj następny krok z opcjami.

---

*Ten plik jest source of truth. Aktualizuj go gdy podejmujemy nowe decyzje produktowe/designerskie.*

---

## 10. Architektura kodu i komendy (Claude Code reference)

Sekcje 1–9 to brief. Ta sekcja to to, co musisz wiedzieć **o samej bazie React**, żeby od razu być produktywny.

### 10.1 Środowisko i komendy

Node trzymamy w **nvm** (nie ma go w `PATH` od razu po starcie sesji). W każdym wywołaniu `Bash` najpierw:
```bash
export NVM_DIR="$HOME/.nvm"; \. "$NVM_DIR/nvm.sh"
```
Potem standardowo:
- `npm run dev` — Vite dev server na **:5173** (`.claude/launch.json` używa absolutnej ścieżki do node z nvm, żeby preview działał)
- `npm run build` — produkcyjny build
- `npx tsc --noEmit` — typecheck (uruchamiaj po każdej większej zmianie, build sprawdza to samo)
- `npm run lint` — ESLint (Vite default config)

Brak skonfigurowanych testów — projekt na razie weryfikujemy wizualnie przez preview (`mcp__Claude_Preview__*`).

### 10.2 Routing i przejścia

`src/App.tsx` zawiera całą logikę routingu. `BrowserRouter` + `AnimatePresence mode="wait"` opakowuje `Routes` w `motion.div` z fade+scale (cubic-bezier `0.32, 0.72, 0, 1`). Trasy:

| Path | Screen | Reguła |
|---|---|---|
| `/onboarding` | `Onboarding` | jeśli `done === true` → redirect na `/` |
| `/` | `Dashboard` | jeśli `done === false` → redirect na `/onboarding` |
| `/sub/:id` | `Action` | jeśli `getById(id) === undefined` → redirect na `/` |

Każdy `useReducedMotion()` musi być respektowany (CLAUDE.md §8).

### 10.3 State — dwa zustand store'y z `persist`

- **`src/store/subscriptions.ts`** — `useSubscriptions`: lista subskrypcji, `addSubscription`, `remove`, `getById`, `lastAddedId` + `clearLastAdded` (highlight świeżo dodanej karty). Persist klucz: `ostatni-dzien-subs`. Mock z `src/data/mock.ts` jest seedem przy pierwszym uruchomieniu.
- **`src/store/onboarding.ts`** — `useOnboarding`: `done`, `markDone`, `reset`. Persist klucz: `ostatni-dzien-onboarding`.
- **`sessionStorage` key `open-adder-after-onboarding`** — most między onboardingiem a Smart Inputem (przeżywa `Navigate` z `replace`, nie przeżywa zamknięcia karty). Ustawia ostatni slajd onboardingu, czyta `Dashboard` przy mount.

### 10.4 Struktura komponentów

```
src/
  screens/        Dashboard, Action, Onboarding         ← per route
  components/
    ui/           Button, Tag, Toast, ConfirmDialog     ← atomy
    cards/        SubCard, SubLogo                      ← karta subskrypcji
    charts/       MiniChart                             ← 6-słupkowy wykres
    layout/       PhoneFrame, StatusBar, SectionDivider ← scena/ramka telefonu
    action/       InstructionSheet                      ← bottom sheet z krokami
    smartinput/   SmartInputFlow (orchestrator),
                  SourceSheet, ProcessingScreen,
                  AddForm, SuccessScreen
    onboarding/   illustrations.tsx                     ← 3 ilustracje slajdów
```

`SubCard` ma 3 warianty: `urgency: 'today'` (Adobe, gradient + eyebrow „UWAGA"), `'critical'` (Netflix/Canva ≤3 dni, lewy terakotowy border + czerwony licznik), `'normal'`. `SubLogo` wspiera `size: 'sm' | 'lg'` (40 px na liście, 72 px na ekranie akcji).

### 10.5 Smart Input (Faza 3) — orchestrator

`SmartInputFlow` to **overlay nad Dashboardem** (FAB ustawia `adding=true`). Trzyma stan kroku:
```
sheet → picker → processing (3 s timeout, fake OCR) → form (mode: 'ai' | 'manual') → success
```
W `'success'`, jedno z dwóch:
- **„Zobacz na liście"** → `addSubscription(draft)` + zamyka flow
- **„Dodaj kolejną"** → `addSubscription(draft)` + reset do `sheet`

`AddForm` w trybie `'ai'` pre-fillsuje **celowo niedokładne** guessy (`Spotify` / `29,99 zł` / `07/06/2026`) z badge'ami AI; badge znika gdy user edytuje pole. W trybie `'manual'` puste pola z placeholderami. **NIE podłączaj realnego OCR** — fake jest decyzją produktową (§2 i §8).

### 10.6 Design tokeny i animacje

- **`tailwind.config.js`** — wszystkie kolory z §3 jako klasy (`bg-bg-base`, `text-accent`, `text-alert`, `border-hairline`…). `fontFamily.serif/sans/mono` mapuje na Fraunces / Geist / Geist Mono. `borderRadius.sm/md/lg/xl/pill`.
- **`src/styles/globals.css`** — fonty z `@fontsource` (importy na górze), plus CSS keyframes które trudno zrobić w Tailwind: `pulse-ring`, `scan-line`, `scanning-glow`, `processing-dots`, `success-pop / success-check / success-ring / success-fade`, `new-card-glow`. Sekcja `@media (prefers-reduced-motion: reduce)` na końcu **wyłącza wszystkie z nich** — gdy dodajesz nową keyframe-animację, dopisz ją do listy.

### 10.7 Logotypy marek (`SubLogo`)

`STYLES` w `src/components/cards/SubLogo.tsx` — rejestr per brand. Trzy ścieżki renderu:

1. **`icon: siNetflix` etc.** — autentyczne logo z `simple-icons` v16 (dostępne: Netflix, Spotify, Notion, Apple, iCloud).
2. **`customPath`** — surowy SVG path 24×24. Adobe ma własny chunky „A".
3. **wordmark** — tekst (`logoText` lub `textOverride`), font sans/serif, opcjonalnie italic.

Plus `bgGradient` zamiast `bg` dla Canva (turkus→fiolet) i Disney+ (granat→błękit). Brandy **usunięte z simple-icons** (Adobe, Canva, Disney+, LinkedIn) zostają na własnym wordmarku — nie odtwarzaj ręcznie ich oficjalnych logo (powód znakowy).

### 10.8 Konwencje

- **Język**: kod, nazwy, commity → angielski. Komentarze JSDoc → polski. UI → polski.
- **Branche**: `phase-N-{nazwa}` (np. `phase-4-onboarding`). Po skończeniu fazy: merge `--no-ff` do `main`, update statusu w `PROJECT_PLAN.md`.
- **Komentarze**: krótkie, wyjaśniają „dlaczego", nie „co". Jeśli komponent ma wariant zależny od propsu, opisz to.
- **CSS**: pierwszeństwo Tailwind, ale jeśli design wymaga gradientu, box-shadow z niestandardowymi wartościami lub konkretnego pikselowego rozmiaru spoza skali — `style={{ ... }}` jest OK (nie utility-everywhere).
- **Easing**: `cubic-bezier(0.32, 0.72, 0, 1)` dla przejść (slide/scale) i `cubic-bezier(0.34, 1.56, 0.64, 1)` dla bouncy (dialog pop, FAB).

### 10.9 Weryfikacja po zmianach

Po każdej znaczącej zmianie wizualnej:
1. `npx tsc --noEmit` (rzadko psuje się build a nie TS — sprawdzaj oba)
2. Otwórz preview (`mcp__Claude_Preview__preview_start` z `dev`), zrób screenshot, porównaj z prototypem HTML w `references/`.
3. Sprawdź wszystkie warianty komponentu (np. `SubCard` w trybach today/critical/normal).
4. `references/` jest w `.gitignore` — to source of truth wizualny, **nie commituj go**.
