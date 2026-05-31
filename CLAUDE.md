# CLAUDE.md — Ostatni Dzień

Ten plik daje Ci pełny kontekst projektu. Przeczytaj go w całości przed pierwszą akcją.

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
