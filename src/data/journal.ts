/**
 * UI-meta dla taksonomii kategorii Ostatni Dzień.
 *
 * Single Source of Truth dla ID/label/typu = `api/_shared/categories.ts`.
 * Ten plik dokłada warstwę prezentacyjną (pill colors, krótkie etykiety)
 * i dane demo do dzienniczka. NIE redefinujemy enum-a tutaj — żeby
 * backend i FE nigdy się nie rozjechały.
 */

import {
  CATEGORY_IDS,
  CATEGORY_LABELS,
  type CategoryId,
} from '../../api/_shared/categories'

export type JournalCategory = CategoryId
export { CATEGORY_IDS, CATEGORY_LABELS }

export interface JournalCategoryMeta {
  id: JournalCategory
  label: string
  /** Tailwind klasy — pill badge (bg + text). Calm UI: stłumione tła, ciemny tekst. */
  pillClass: string
}

/** Paleta pillów — 7 stłumionych kolorów, jeden per kategoria. */
export const CATEGORY_META: Record<JournalCategory, JournalCategoryMeta> = {
  media_vod: {
    id: 'media_vod',
    label: CATEGORY_LABELS.media_vod,
    pillClass: 'bg-[#F5E4DC] text-[#8E4226]',
  },
  audio_podcasts: {
    id: 'audio_podcasts',
    label: CATEGORY_LABELS.audio_podcasts,
    pillClass: 'bg-[#E8DFEC] text-[#5C3F66]',
  },
  design_creative: {
    id: 'design_creative',
    label: CATEGORY_LABELS.design_creative,
    pillClass: 'bg-[#EFE6D7] text-[#7A5A1F]',
  },
  ai_tools: {
    id: 'ai_tools',
    label: CATEGORY_LABELS.ai_tools,
    pillClass: 'bg-accent-soft text-accent',
  },
  productivity_cloud: {
    id: 'productivity_cloud',
    label: CATEGORY_LABELS.productivity_cloud,
    pillClass: 'bg-[#E3E8EC] text-[#34495A]',
  },
  shopping_gaming: {
    id: 'shopping_gaming',
    label: CATEGORY_LABELS.shopping_gaming,
    pillClass: 'bg-[#F1DDD8] text-[#7A3826]',
  },
  other: {
    id: 'other',
    label: CATEGORY_LABELS.other,
    pillClass: 'bg-bg-subtle text-ink-secondary',
  },
}

export interface JournalPhoto {
  id: string
  signedUrl: string | null
  mimeType: string
  width: number | null
  height: number | null
  position: number
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
  photos?: JournalPhoto[]
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
    category: 'media_vod',
    title: 'Netflix — podwyżka i co dalej',
    summary:
      'Rozmowa o nowym cenniku Netflixa (67 zł/mc) i czy zostać. Subskrypcik zaproponował pauzę na miesiąc i porównanie z HBO Max — odłożyłem decyzję na koniec czerwca.',
    photos: [
      { id: 'demo-1a-1', signedUrl: 'https://picsum.photos/seed/netflix1/800/600', mimeType: 'image/jpeg', width: 800, height: 600, position: 0 },
    ],
  },
  {
    id: 'j-jun-11b',
    date: '2026-06-11',
    startTime: '18:02',
    endTime: '18:14',
    category: 'ai_tools',
    title: 'ChatGPT Plus vs Claude Pro',
    summary:
      'Porównanie planów AI pod kątem mojego użycia (pisanie + kod). Rekomendacja: przetestować Claude równolegle przez miesiąc zanim zrezygnuję z ChatGPT.',
    photos: [
      { id: 'demo-1b-1', signedUrl: 'https://picsum.photos/seed/ai1/600/600', mimeType: 'image/jpeg', width: 600, height: 600, position: 0 },
      { id: 'demo-1b-2', signedUrl: 'https://picsum.photos/seed/ai2/600/600', mimeType: 'image/jpeg', width: 600, height: 600, position: 1 },
      { id: 'demo-1b-3', signedUrl: 'https://picsum.photos/seed/ai3/600/600', mimeType: 'image/jpeg', width: 600, height: 600, position: 2 },
      { id: 'demo-1b-4', signedUrl: 'https://picsum.photos/seed/ai4/600/600', mimeType: 'image/jpeg', width: 600, height: 600, position: 3 },
      { id: 'demo-1b-5', signedUrl: 'https://picsum.photos/seed/ai5/600/600', mimeType: 'image/jpeg', width: 600, height: 600, position: 4 },
    ],
  },
  {
    id: 'j-jun-09',
    date: '2026-06-09',
    startTime: '11:40',
    endTime: '12:05',
    category: 'design_creative',
    title: 'Figma — przejście na plan roczny',
    summary:
      'Sprawdziliśmy, czy plan roczny Figmy się opłaca. Przy obecnym tempie pracy zwrot po 8 miesiącach. Przypomnienie na koniec bieżącego cyklu miesięcznego.',
    photos: [
      { id: 'demo-2-1', signedUrl: 'https://picsum.photos/seed/figma1/600/600', mimeType: 'image/jpeg', width: 600, height: 600, position: 0 },
      { id: 'demo-2-2', signedUrl: 'https://picsum.photos/seed/figma2/600/600', mimeType: 'image/jpeg', width: 600, height: 600, position: 1 },
    ],
  },
  {
    id: 'j-jun-05',
    date: '2026-06-05',
    startTime: '22:10',
    endTime: '22:28',
    category: 'productivity_cloud',
    title: '1Password — rodzina czy solo',
    summary:
      'Analiza planu rodzinnego dla 3 osób. Wniosek: tak, oszczędność 12 zł/mc względem trzech kont solo. Zmiana zaplanowana na nowy okres rozliczeniowy.',
    photos: [
      { id: 'demo-3-1', signedUrl: 'https://picsum.photos/seed/op1/600/600', mimeType: 'image/jpeg', width: 600, height: 600, position: 0 },
      { id: 'demo-3-2', signedUrl: 'https://picsum.photos/seed/op2/600/600', mimeType: 'image/jpeg', width: 600, height: 600, position: 1 },
      { id: 'demo-3-3', signedUrl: 'https://picsum.photos/seed/op3/600/600', mimeType: 'image/jpeg', width: 600, height: 600, position: 2 },
    ],
  },

  // ── MAJ 2026 ───────────────────────────────────────────────────
  {
    id: 'j-may-28a',
    date: '2026-05-28',
    startTime: '21:00',
    endTime: '21:18',
    category: 'media_vod',
    title: 'Disney+ — trial kończy się 1.06',
    summary:
      'Przypomnienie, że trial Disney+ kończy się za 4 dni. Zdecydowałem o anulowaniu — Subskrypcik podał deep link do ustawień konta.',
  },
  {
    id: 'j-may-28b',
    date: '2026-05-28',
    startTime: '14:20',
    endTime: '14:45',
    category: 'design_creative',
    title: 'Adobe CC — szukanie alternatyw',
    summary:
      'Przegląd alternatyw (Affinity, DaVinci). Decyzja: zostaję na CC ze względu na flow z klientami, ale zmieniam plan na pojedynczą aplikację — Photoshop.',
  },
  {
    id: 'j-may-22',
    date: '2026-05-22',
    startTime: '19:45',
    endTime: '20:01',
    category: 'ai_tools',
    title: 'Midjourney — czy nadal używam',
    summary:
      'Subskrypcik zauważył, że nie generowałem nic od 6 tygodni. Podjąłem decyzję o anulowaniu — 30 USD/mc oszczędności.',
  },
  {
    id: 'j-may-15',
    date: '2026-05-15',
    startTime: '08:30',
    endTime: '08:48',
    category: 'productivity_cloud',
    title: 'NordVPN — odnowienie 2-letnie',
    summary:
      'Subskrypcik ostrzegł przed automatycznym odnowieniem na 2 lata po cenie wyjściowej. Decyzja: przejście na plan roczny po obecnym okresie.',
  },
  {
    id: 'j-may-07',
    date: '2026-05-07',
    startTime: '13:10',
    endTime: '13:22',
    category: 'audio_podcasts',
    title: 'Spotify — Family czy Premium',
    summary:
      'Krótka rozmowa o tym, czy ma sens dołożyć żonę do planu. Tak — różnica 9 zł/mc przy 2 osobach.',
  },
]

/** Krótkie etykiety pillów na karcie subskrypcji (na liście dashboardu). */
export const CATEGORY_SHORT_LABEL: Record<JournalCategory, string> = {
  media_vod: 'VOD',
  audio_podcasts: 'Audio',
  design_creative: 'Design',
  ai_tools: 'AI',
  productivity_cloud: 'Praca',
  shopping_gaming: 'Gaming',
  other: 'Inne',
}

/**
 * Heurystyka brand → kategoria. Używana jako fallback w UI gdy kolumna
 * `category` w bazie jest pusta (legacy wiersze sprzed migracji albo nazwa
 * spoza listy). Realnym źródłem prawdy jest kolumna w DB ustawiana przez
 * agenta (add_subscription) albo backfill.
 */
export function categorizeSubscription(name: string): JournalCategory {
  const n = name.toLowerCase()
  if (/(netflix|hbo|disney|player|canal|prime\s*video|youtube|apple\s*tv|max(\s|$))/.test(n))
    return 'media_vod'
  if (/(spotify|tidal|deezer|apple\s*music|audible|storytel|empik\s*go)/.test(n))
    return 'audio_podcasts'
  if (/(chatgpt|openai|claude|anthropic|midjourney|gemini|perplexity|copilot|cursor|notion\s*ai|runway)/.test(n))
    return 'ai_tools'
  if (/(figma|adobe|photoshop|lightroom|premiere|illustrator|canva|framer|sketch|affinity)/.test(n))
    return 'design_creative'
  if (/(notion(?!\s*ai)|linear|slack|google\s*workspace|microsoft\s*365|icloud|dropbox|onedrive|1password|nordvpn|expressvpn|surfshark|protonvpn|bitwarden|vpn|linkedin)/.test(n))
    return 'productivity_cloud'
  if (/(amazon\s*prime|allegro|xbox|playstation|ps\s*plus|game\s*pass|nintendo|steam)/.test(n))
    return 'shopping_gaming'
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
