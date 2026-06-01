# PROJECT_PLAN.md — Ostatni Dzień

Roadmap projektu. Aktualizuj sekcję "Status" po każdej fazie.

---

## Status (stan na: start projektu w Claude Code)

- ✅ **Faza 0** — Design System (ukończona w prototypie HTML)
- ✅ **Faza 1 (prototyp)** — Dashboard MVP (klikalny HTML)
- ✅ **Faza 2 (prototyp)** — Ekran Akcji (klikalny HTML)
- ✅ **Faza 3 (prototyp)** — Smart Input flow (klikalny HTML)
- ✅ **Faza 1 (React)** — Setup Vite + Dashboard z mock data
- ✅ **Faza 2 (React)** — Ekran Akcji + routing + przejścia fade+scale
- ✅ **Faza 3 (React)** — Smart Input (sheet → fake OCR → formularz → sukces, localStorage)
- ⏳ **Faza 4 (React)** — **TU JESTEŚMY** — Onboarding (3 slajdy + dots + swipe, flaga onboardingDone)
- ⏸️ Faza 5 — Spięcie w pełen prototyp + deploy
- ⏸️ Walidacja z użytkownikami
- ⏸️ Roadmapa post-MVP

---

## Faza 1 (React) — Setup projektu + Dashboard

**Cel:** Postawić projekt Vite+React+TS+Tailwind. Przepisać Dashboard 1:1 z prototypu HTML.

**Definition of Done:**
- [ ] Projekt uruchamia się przez `npm run dev`
- [ ] Tailwind skonfigurowany z naszymi design tokenami
- [ ] Fonty (Fraunces, Geist, Geist Mono) załadowane przez `@fontsource` lub `<link>` w `index.html`
- [ ] Dashboard wyświetla 8 subskrypcji jak w prototypie
- [ ] Karta "Adobe Dziś" ma pulsujący badge "Uwaga" i gradient bg
- [ ] FAB widoczny w prawym dolnym (na razie bez akcji)
- [ ] Działa scroll listy
- [ ] Git zainicjalizowany, pierwszy commit, opcjonalnie push do GitHub
- [ ] Plik `references/` zawiera 4 HTML-e jako referencję wizualną

**Konkretne taski (w kolejności):**

1. **Setup projektu**
   ```bash
   npm create vite@latest . -- --template react-ts
   npm install
   npm install -D tailwindcss postcss autoprefixer @tailwindcss/forms
   npx tailwindcss init -p
   npm install framer-motion react-router-dom zustand clsx lucide-react
   npm install @fontsource/fraunces @fontsource/geist-sans @fontsource/geist-mono
   ```

2. **Tailwind config** — wkleić design tokeny do `tailwind.config.js`:
   - colors: bg-base, bg-card, ink-primary, accent, alert itd. (z CLAUDE.md sekcja 3)
   - fontFamily: serif (Fraunces), sans (Geist), mono (Geist Mono)
   - extend.spacing: 4-base scale
   - extend.borderRadius: sm/md/lg/xl

3. **Struktura folderów:**
   ```
   src/
     components/
       ui/              # Button, Tag, Card primitives
       cards/           # SubCard
       layout/          # PhoneFrame, StatusBar
     screens/
       Dashboard.tsx
       Action.tsx
       SmartInput/
         Sheet.tsx
         Processing.tsx
         Form.tsx
         Success.tsx
       Onboarding.tsx
     store/
       subscriptions.ts # zustand
     types/
       subscription.ts
     data/
       mock.ts          # 8 mock subscriptions z prototypu
     styles/
       globals.css
     App.tsx
     main.tsx
   ```

4. **Typy** — w `types/subscription.ts`:
   ```typescript
   export type SubscriptionType = 'trial' | 'renewal';
   export type Urgency = 'today' | 'critical' | 'normal';

   export interface Subscription {
     id: string;
     name: string;
     logoClass: string;      // 'netflix' | 'spotify' | ...
     logoText: string;
     daysUntil: number;      // -1 dla "dziś"
     date: string;           // "2 czerwca · 9:00"
     amount: string;         // "67,00 zł"
     period: string;         // "miesięcznie" lub "po próbie..."
     type: SubscriptionType;
     chartHeights: number[]; // 6 elementów
     chartTotal: string;
   }
   ```

5. **Mock data** — 8 subskrypcji z prototypu (Adobe, Netflix, Canva, Spotify, Notion, Disney+, iCloud, LinkedIn).

6. **Komponenty atomowe** — `Button`, `Tag`, `SubCard`. Każdy z odpowiednimi wariantami przez `clsx`.

7. **Dashboard screen** — header + hero stat + 4 sekcje z mapowaniem subskrypcji.

8. **Commit:** `feat: phase 1 — vite setup + dashboard with mock data`

---

## Faza 2 (React) — Ekran Akcji

**Cel:** Dynamiczny ekran akcji + nawigacja z Dashboardu.

**Definition of Done:**
- [ ] React Router z routes `/`, `/sub/:id`, `/sub/:id/critical`
- [ ] Klik w kartę → przejście fade+scale przez Framer Motion (`AnimatePresence`)
- [ ] Ekran akcji wyświetla dane konkretnej subskrypcji (przez `useParams` + zustand)
- [ ] Wariant krytyczny dla Adobe (≤3 dni z trial) → osobny komponent `ActionCritical`
- [ ] Mini-wykres renderuje się z `chartHeights`
- [ ] Dialog "Usuń z listy" z potwierdzeniem
- [ ] CTA "Anuluj w X" → `window.open()` z mock URL (na razie placeholder)
- [ ] CTA "Pokaż instrukcję" → bottom sheet z mock krokami (3-4 numerowane linie)

---

## Faza 3 (React) — Smart Input

**Cel:** Pełen flow dodawania subskrypcji.

**Definition of Done:**
- [ ] FAB otwiera bottom sheet (Framer Motion, slide z dołu)
- [ ] Klik "Wrzuć screenshot" → systemowy file picker (`<input type="file">`)
- [ ] Po wybraniu pliku → ekran przetwarzania (3 sek)
- [ ] Skanująca linia z glow w CSS lub Framer Motion
- [ ] Formularz z "AI guesses" (hardcoded niedokładne dane)
- [ ] Badge AI znika po edycji pola (Framer Motion fade)
- [ ] Type toggle (trial/renewal)
- [ ] Zapis dodaje subskrypcję do zustand store
- [ ] Sukces fullscreen z animacją (circle pop + check draw + ring expand)
- [ ] "Zobacz na liście" → powrót do Dashboardu z highlightem nowej karty
- [ ] localStorage persistence przez `zustand/middleware/persist`

---

## Faza 4 (React) — Onboarding

**Cel:** 3-ekranowy onboarding kończący się Smart Inputem.

**Definition of Done:**
- [ ] Route `/onboarding` jako default jeśli `localStorage.onboardingDone !== true`
- [ ] 3 ekrany swipowalne (Framer Motion drag lub dots-nav):
  1. *"Koniec niechcianych opłat"* — wartość produktu
  2. *"Wrzuć screenshot, my zrobimy resztę"* — pokazujesz Smart Input
  3. *"Dodaj pierwszą subskrypcję"* — CTA wchodzi w Smart Input
- [ ] Po ukończeniu — `localStorage.onboardingDone = true`
- [ ] Pomijać onboarding przy kolejnym otwarciu

---

## Faza 5 (React) — Polish + Deploy

**Cel:** Wszystko spięte, gotowe do pokazania ludziom.

**Definition of Done:**
- [ ] Wszystkie ekrany spójne wizualnie z prototypem HTML
- [ ] `prefers-reduced-motion` respektowane
- [ ] Lighthouse score >90 (mobile)
- [ ] Meta tagi (title, description, OG image)
- [ ] Favicon
- [ ] Deploy na Vercel z custom subdomeną (np. `ostatnidzien.vercel.app`)
- [ ] README.md z opisem projektu, screenshotem, linkiem do live
- [ ] Tag `v0.1-mvp` w gicie

---

## Walidacja (post-Faza 5)

**Cel:** Dowiedzieć się czy ludzie tego chcą, **zanim** budujemy prawdziwą aplikację mobilną.

### 5-7 wywiadów jakościowych
- Wrzucasz link prototypu w ręce 5-7 osobom z grupy docelowej
- Obserwujesz gdzie się gubią (Lookback / własne nagranie ekranu)
- Pytanie kluczowe: *"Co myślisz, że ta aplikacja robi?"*
- Drugie: *"Jak byś użył tego w swoim życiu?"*
- Trzecie: *"Co jest niejasne?"*

### Test fake-door
- Landing page z prototypem jako wideo
- Formularz "powiadom mnie o premierze"
- Reklama na Facebook/Instagram dla ~50 zł
- Mierzysz CTR → konwersję na zapis
- Cel: ≥5% konwersji = realny popyt

### Walidacja iluzji OCR
- W wywiadach sprawdź czy ludzie chcą wrzucać screenshoty
- Czy wybaczają imperfekcję AI guesses?
- Czy wolą wpisywać ręcznie?
- Decyzja: budować prawdziwy OCR (drogie) czy zostawić manual?

---

## Co po MVP (iteracja 2 — nie planuj teraz)

- Integracja API ze skrzynkami mailowymi (Gmail/Outlook) — auto-wyłapywanie subskrypcji
- Zaawansowany system powiadomień push z deep linkami
- Moduł statystyk — wizualizacja oszczędności / zablokowanego odpływu gotówki
- Prawdziwa apka mobilna (Capacitor lub React Native rewrite)
- Backend (auth, sync między urządzeniami)
- Płatności / monetyzacja

---

*Po ukończeniu każdej fazy — update Status na górze i commit.*
