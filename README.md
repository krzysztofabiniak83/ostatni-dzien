# Ostatni Dzień

> Aplikacja, która pamięta o Twoich subskrypcjach i triallach. **Pokażemy ile dni zostało, anulujemy zanim pobiorą środki.**

**🟢 Live demo:** [ostatni-dzien-2mn8.vercel.app](https://ostatni-dzien-2mn8.vercel.app/onboarding) · **Status:** MVP klikalny prototyp (4 fazy ukończone). Walidacja z użytkownikami w następnym kroku.

## Co to robi

Mobilna aplikacja (na razie web prototype) chroniąca przed niechcianymi opłatami za zapomniane okresy próbne i automatycznie odnawiane subskrypcje. Trzy filary:

1. **Dashboard** — chronologiczna lista nadchodzących pobrań z licznikiem dni i wizualnym podkreśleniem stanu krytycznego (≤3 dni)
2. **Smart Input** — bezbolesne dodawanie: wrzucasz screenshot potwierdzenia, my czytamy nazwę / kwotę / datę (w MVP odczyt symulowany, do korekty)
3. **Ekran akcji** — szczegóły, mini-wykres 6 miesięcy, jednoklikowe „Anuluj w X" lub instrukcja krok po kroku

## Stack

- **Vite + React 19 + TypeScript**
- **Tailwind CSS v3** (design tokeny w `tailwind.config.js`, animacje w `src/styles/globals.css`)
- **Framer Motion** — przejścia fade+scale między ekranami, drag onboardingu, animacje sukcesu
- **react-router-dom** — `/onboarding`, `/`, `/sub/:id`
- **zustand + persist** — store subskrypcji i flagi onboardingu w `localStorage`
- **simple-icons** — autentyczne logo brandów (Netflix, Spotify, Notion, Apple, iCloud)
- **Fonty**: Fraunces (display), Geist (UI), Geist Mono (labelki) — via `@fontsource`

## Uruchomienie lokalne

Wymagania: **Node 20+**.

```bash
git clone https://github.com/krzysztofabiniak83/ostatni-dzien.git
cd ostatni-dzien
npm install
npm run dev
```

Dev server: `http://localhost:5173`

### Inne komendy

```bash
npm run build         # produkcyjny build do dist/
npm run preview       # podgląd produkcyjnego buildu
npx tsc --noEmit      # typecheck
npm run lint          # ESLint
```

## Architektura w skrócie

Zobacz `CLAUDE.md` — sekcja **10** opisuje:
- routing i przejścia (`AnimatePresence` + redirect logic)
- dwa zustand store'y (`subscriptions`, `onboarding`) + sessionStorage most
- strukturę komponentów (`screens/`, `components/{ui,cards,charts,layout,smartinput,onboarding,action}`)
- `SmartInputFlow` orchestrator (sheet → picker → processing → form → success)
- rejestr logotypów w `SubLogo`
- konwencje (branche `phase-N-*`, easing, język komentarzy)

Sekcje 1–9 to brief produktowo/designerski.

## Decyzje warte podkreślenia

- **OCR jest udawany w MVP** — formularz po skanowaniu pre-fillsuje *celowo niedokładne* AI guessy, badge „AI" znika po edycji pola. Decyzja o prawdziwym OCR po walidacji.
- **Brandy usunięte z `simple-icons`** (Adobe, Canva, Disney+, LinkedIn) mają wordmark zamiast oficjalnego logo — uczciwie, nie odtwarzamy znaków, których właściciele wycofali z otwartego użycia.
- **Calm/minimal, editorial** — żadnych fioletowych gradientów ani „modern AI aesthetics". Akcent ciemnej zieleni (`#1F3D33`), stan krytyczny terakotowy (`#B85C3C`).
- **`prefers-reduced-motion` respektowane wszędzie** — pulse-ring, scan-line, success animations są wyłączane.

## Roadmapa post-MVP

Po walidacji: integracja Gmail/Outlook, prawdziwe OCR (jeśli walidacja powie że trzeba), prawdziwa apka mobilna (Capacitor lub React Native), backend (auth + sync), monetyzacja.

## Licencja

Prywatne. Wszelkie prawa zastrzeżone.
