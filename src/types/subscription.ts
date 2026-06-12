import type { CategoryId } from '../../api/_shared/categories'

export type SubscriptionType = 'trial' | 'renewal'

/** Pilność karty — steruje wariantem wizualnym SubCard. */
export type Urgency = 'today' | 'critical' | 'normal'

/** Sekcja na dashboardzie — grupowanie chronologiczne. */
export type Section = 'today' | 'week' | 'month' | 'later'

export interface Subscription {
  id: string
  name: string
  /** Klucz koloru logo — patrz LOGO_STYLES w SubCard. */
  logoClass: string
  /** Tekst/inicjały w kafelku logo (np. "N", "Ai", "in"). */
  logoText: string
  /** Dni do pobrania. -1 oznacza "dziś". */
  daysUntil: number
  /** Czytelna data pobrania, np. "2 czerwca · 9:00" lub "Dziś · 23:59". */
  date: string
  /** Kwota w GROSZACH (waluta bazowa PLN). Np. 6700 = 67,00 zł. */
  amountPLN: number
  /** Okres/kontekst, np. "miesięcznie" lub "po próbie, potem miesięcznie". */
  period: string
  /** Krótki opis pod kwotą na karcie, np. "miesięcznie" / "po próbie". */
  periodShort: string
  type: SubscriptionType
  urgency: Urgency
  section: Section
  /**
   * Kategoria taksonomii Ostatni Dzień. W bazie always-set (default 'other').
   * FE-side opcjonalne tylko ze względu na legacy mock danych — patrz
   * `categorizeSubscription()` jako fallback.
   */
  category?: CategoryId
  /** 6 słupków mini-wykresu (wysokości 0-60) — wykorzystane w Fazie 2. */
  chartHeights: number[]
  /** Suma z ostatnich 6 miesięcy w GROSZACH (PLN). Np. 40200 = 402,00 zł. */
  chartTotalPLN: number
}
