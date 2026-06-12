/**
 * Mock danych "Dzienniczka Rozmów" z Subskrypcikiem.
 * W realnym wdrożeniu — mapowanie z API historii sesji czatu na strukturę
 * { date, entries[] } z kategorią rozpoznaną po treści/kontekście.
 */

export type JournalCategory =
  | 'media'
  | 'ai'
  | 'design'
  | 'security'
  | 'other'

export interface JournalCategoryMeta {
  id: JournalCategory
  label: string
  /** Tailwind klasy — pill badge (bg + text). Calm UI: stłumione tła, ciemny tekst. */
  pillClass: string
}

export const CATEGORY_META: Record<JournalCategory, JournalCategoryMeta> = {
  media: {
    id: 'media',
    label: 'Media i TV',
    pillClass: 'bg-[#F5E4DC] text-[#8E4226]',
  },
  ai: {
    id: 'ai',
    label: 'Narzędzia AI',
    pillClass: 'bg-accent-soft text-accent',
  },
  design: {
    id: 'design',
    label: 'Narzędzia Designera',
    pillClass: 'bg-[#EFE6D7] text-[#7A5A1F]',
  },
  security: {
    id: 'security',
    label: 'Bezpieczeństwo',
    pillClass: 'bg-[#E3E8EC] text-[#34495A]',
  },
  other: {
    id: 'other',
    label: 'Pozostałe',
    pillClass: 'bg-bg-subtle text-ink-secondary',
  },
}

export interface JournalEntry {
  id: string
  /** ISO `YYYY-MM-DD` — klucz dnia, po którym grupujemy. */
  date: string
  /** Lokalny czas `HH:mm`. */
  startTime: string
  endTime: string
  category: JournalCategory
  title: string
  summary: string
}

/**
 * Demo wpisów na produkcji — daty na sztywno (czerwiec + maj 2026).
 * 4 wpisy w czerwcu (w tym dzień z dwoma rozmowami) + 5 wpisów w maju (w tym
 * dzień z dwoma rozmowami). Realne konwersacje usera nadpisują te wpisy.
 */
export const MOCK_JOURNAL: JournalEntry[] = [
  // ── CZERWIEC 2026 ──────────────────────────────────────────────
  {
    id: 'j-jun-11a',
    date: '2026-06-11',
    startTime: '20:30',
    endTime: '21:15',
    category: 'media',
    title: 'Netflix — podwyżka i co dalej',
    summary:
      'Rozmowa o nowym cenniku Netflixa (67 zł/mc) i czy zostać. Subskrypcik zaproponował pauzę na miesiąc i porównanie z HBO Max — odłożyłem decyzję na koniec czerwca.',
  },
  {
    id: 'j-jun-11b',
    date: '2026-06-11',
    startTime: '18:02',
    endTime: '18:14',
    category: 'ai',
    title: 'ChatGPT Plus vs Claude Pro',
    summary:
      'Porównanie planów AI pod kątem mojego użycia (pisanie + kod). Rekomendacja: przetestować Claude równolegle przez miesiąc zanim zrezygnuję z ChatGPT.',
  },
  {
    id: 'j-jun-09',
    date: '2026-06-09',
    startTime: '11:40',
    endTime: '12:05',
    category: 'design',
    title: 'Figma — przejście na plan roczny',
    summary:
      'Sprawdziliśmy, czy plan roczny Figmy się opłaca. Przy obecnym tempie pracy zwrot po 8 miesiącach. Przypomnienie na koniec bieżącego cyklu miesięcznego.',
  },
  {
    id: 'j-jun-05',
    date: '2026-06-05',
    startTime: '22:10',
    endTime: '22:28',
    category: 'security',
    title: '1Password — rodzina czy solo',
    summary:
      'Analiza planu rodzinnego dla 3 osób. Wniosek: tak, oszczędność 12 zł/mc względem trzech kont solo. Zmiana zaplanowana na nowy okres rozliczeniowy.',
  },

  // ── MAJ 2026 ───────────────────────────────────────────────────
  {
    id: 'j-may-28a',
    date: '2026-05-28',
    startTime: '21:00',
    endTime: '21:18',
    category: 'media',
    title: 'Disney+ — trial kończy się 1.06',
    summary:
      'Przypomnienie, że trial Disney+ kończy się za 4 dni. Zdecydowałem o anulowaniu — Subskrypcik podał deep link do ustawień konta.',
  },
  {
    id: 'j-may-28b',
    date: '2026-05-28',
    startTime: '14:20',
    endTime: '14:45',
    category: 'design',
    title: 'Adobe CC — szukanie alternatyw',
    summary:
      'Przegląd alternatyw (Affinity, DaVinci). Decyzja: zostaję na CC ze względu na flow z klientami, ale zmieniam plan na pojedynczą aplikację — Photoshop.',
  },
  {
    id: 'j-may-22',
    date: '2026-05-22',
    startTime: '19:45',
    endTime: '20:01',
    category: 'ai',
    title: 'Midjourney — czy nadal używam',
    summary:
      'Subskrypcik zauważył, że nie generowałem nic od 6 tygodni. Podjąłem decyzję o anulowaniu — 30 USD/mc oszczędności.',
  },
  {
    id: 'j-may-15',
    date: '2026-05-15',
    startTime: '08:30',
    endTime: '08:48',
    category: 'security',
    title: 'NordVPN — odnowienie 2-letnie',
    summary:
      'Subskrypcik ostrzegł przed automatycznym odnowieniem na 2 lata po cenie wyjściowej. Decyzja: przejście na plan roczny po obecnym okresie.',
  },
  {
    id: 'j-may-07',
    date: '2026-05-07',
    startTime: '13:10',
    endTime: '13:22',
    category: 'other',
    title: 'Spotify — Family czy Premium',
    summary:
      'Krótka rozmowa o tym, czy ma sens dołożyć żonę do planu. Tak — różnica 9 zł/mc przy 2 osobach.',
  },
]

/** Krótkie etykiety pillów na karcie subskrypcji (na liście dashboardu). */
export const CATEGORY_SHORT_LABEL: Record<JournalCategory, string> = {
  media: 'Media',
  ai: 'AI',
  design: 'Design',
  security: 'Security',
  other: 'Inne',
}

/**
 * Mapuje nazwę subskrypcji na kategorię dzienniczka.
 * Heurystyka — łapie najpopularniejsze brandy. Reszta wpada w `other`.
 */
export function categorizeSubscription(name: string): JournalCategory {
  const n = name.toLowerCase()
  if (/(netflix|hbo|disney|spotify|apple\s*tv|apple\s*music|youtube|player|canal|prime|max|tidal|deezer)/.test(n))
    return 'media'
  if (/(chatgpt|openai|claude|anthropic|midjourney|gemini|perplexity|copilot|runway|cursor|notion\s*ai)/.test(n))
    return 'ai'
  if (/(figma|adobe|canva|framer|sketch|invision|affinity|webflow|notion(?!\s*ai))/.test(n))
    return 'design'
  if (/(1password|nordvpn|expressvpn|surfshark|protonvpn|bitwarden|dashlane|lastpass|vpn)/.test(n))
    return 'security'
  return 'other'
}

/** Grupuje wpisy po dacie ISO, sortuje godzinami malejąco (najnowsze u góry). */
export function groupByDate(entries: JournalEntry[]): Record<string, JournalEntry[]> {
  const map: Record<string, JournalEntry[]> = {}
  for (const e of entries) {
    if (!map[e.date]) map[e.date] = []
    map[e.date].push(e)
  }
  for (const date in map) {
    map[date].sort((a, b) => b.startTime.localeCompare(a.startTime))
  }
  return map
}
