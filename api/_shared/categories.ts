/**
 * Single Source of Truth dla taksonomii kategorii subskrypcji/rozmów.
 *
 * Te 7 wartości obowiązują wszędzie:
 * - kolumna `category` w tabeli `subscriptions` (Supabase)
 * - kolumna `category` w tabeli `conversations` (enum `conversation_category`)
 * - tool `add_subscription` (chat.ts, mcp.ts)
 * - tool `list_journal_entries` (mcp.ts)
 * - klasyfikator LLM w /api/journal (finalize)
 * - UI: pille na SubCard i EntryCard
 *
 * Plik jest importowany zarówno z `api/*` (Vercel functions, Node ESM) jak i z
 * `src/*` (Vite bundler). Trzymamy go po stronie `api/_shared` żeby backend
 * miał kanoniczne źródło — FE importuje przez relatywną ścieżkę.
 */

export const CATEGORY_IDS = [
  'media_vod',
  'audio_podcasts',
  'design_creative',
  'ai_tools',
  'productivity_cloud',
  'shopping_gaming',
  'other',
] as const

export type CategoryId = (typeof CATEGORY_IDS)[number]

/** Pełne nazwy wyświetlane userowi (PL). */
export const CATEGORY_LABELS: Record<CategoryId, string> = {
  media_vod: 'Media i VOD',
  audio_podcasts: 'Audio i Podcasty',
  design_creative: 'Designer Tools',
  ai_tools: 'Narzędzia AI',
  productivity_cloud: 'Produktywność i Chmura',
  shopping_gaming: 'Zakupy i Gaming',
  other: 'Pozostałe',
}

/** Domyślny fallback gdy nie umiemy zaklasyfikować. */
export const DEFAULT_CATEGORY: CategoryId = 'other'

/** Type guard — używany do walidacji odpowiedzi LLM i payloadów REST/MCP. */
export function isCategoryId(value: unknown): value is CategoryId {
  return typeof value === 'string' && (CATEGORY_IDS as readonly string[]).includes(value)
}

/**
 * Tekstowy opis taksonomii dla promptów LLM — używany w SUMMARY_PROMPT
 * (klasyfikacja konwersacji) oraz w opisie toola add_subscription.
 */
export const CATEGORY_GUIDE_FOR_LLM = `Dozwolone kategorie (id → znaczenie, przykłady):
- media_vod → "Media i VOD": Netflix, HBO Max, Disney+, Apple TV+, Player, Canal+, YouTube Premium, Prime Video
- audio_podcasts → "Audio i Podcasty": Spotify, Apple Music, Tidal, Deezer, Audible, Storytel, Empik Go, podcasty premium
- design_creative → "Designer Tools": Figma, Adobe Creative Cloud (Photoshop/Lightroom/Premiere), Canva, Framer, Sketch, Affinity
- ai_tools → "Narzędzia AI": ChatGPT, Claude, Gemini, Perplexity, Midjourney, Runway, Copilot, Cursor, Notion AI
- productivity_cloud → "Produktywność i Chmura": Notion, Linear, Slack, Google Workspace, Microsoft 365, iCloud+, Dropbox, 1Password, NordVPN, ExpressVPN, menedżery haseł, VPN
- shopping_gaming → "Zakupy i Gaming": Amazon Prime, Allegro Smart, Xbox Game Pass, PlayStation Plus, Nintendo Online, Steam Family
- other → "Pozostałe": fitness (Zdrofit, Multisport), zdrowie, edukacja, wszystko poza pozostałymi koszykami

Wybierz dokładnie jedną kategorię. Jeśli usługa ma wiele zastosowań — wybierz dominujące. Jeśli nie pasuje do żadnej grupy, zwróć "other".`
