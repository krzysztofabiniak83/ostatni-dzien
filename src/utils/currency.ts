import { useSettings, type Currency } from '../store/settings'

/**
 * Sztywne kursy walutowe — MVP. W produkcji podmienić na fetch z NBP/ECB.
 * Notacja: ile jednostek `target` za 1 jednostkę `from`.
 */
const RATES: Record<Currency, Record<Currency, number>> = {
  PLN: { PLN: 1, EUR: 0.2336, USD: 0.2519 },
  EUR: { PLN: 4.28, EUR: 1, USD: 1.08 },
  USD: { PLN: 3.97, EUR: 0.93, USD: 1 },
}

/** Konwertuje kwotę w groszach z waluty bazowej do docelowej. */
export function convertAmount(
  amountInMinor: number,
  from: Currency,
  to: Currency,
): number {
  if (from === to) return amountInMinor
  return Math.round(amountInMinor * RATES[from][to])
}

/**
 * Formatuje kwotę (w jednostkach minor — gr/cent) jako tekst zgodnie z konwencją:
 * - PLN: "289,99 zł"
 * - EUR: "67,82 €"
 * - USD: "$72,49"
 */
export function formatAmount(amountInMinor: number, currency: Currency): string {
  // Defensywnie: undefined / NaN (np. stara persystencja) → traktuj jak 0.
  const safe = typeof amountInMinor === 'number' && Number.isFinite(amountInMinor) ? amountInMinor : 0
  const major = safe / 100
  // Polski lokal: "289,99". USD też z przecinkiem dla spójności wizualnej.
  const value = major.toLocaleString('pl-PL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  if (currency === 'PLN') return `${value} zł`
  if (currency === 'EUR') return `${value} €`
  return `$${value}`
}

/**
 * Hook — zwraca funkcję `format(amountPLN)` która jednocześnie konwertuje
 * z waluty bazowej (PLN, grosze) do aktualnej waluty z ustawień i formatuje.
 *
 * Komponent przerysuje się gdy user zmieni walutę w ustawieniach.
 */
export function useFormatAmount() {
  const currency = useSettings((s) => s.currency)
  return (amountPLN: number) => formatAmount(convertAmount(amountPLN, 'PLN', currency), currency)
}

/**
 * Parsuje string wpisany przez usera w formularzu (np. "29,99 zł" lub "29.99")
 * na grosze. Bez kwoty / niezrozumiałe → null.
 */
export function parseAmountInput(raw: string): number | null {
  const cleaned = raw
    .replace(/zł|pln|eur|usd|\$|€|\s/gi, '')
    .replace(',', '.')
    .trim()
  if (!cleaned) return null
  const n = Number.parseFloat(cleaned)
  if (!Number.isFinite(n)) return null
  return Math.round(n * 100)
}
