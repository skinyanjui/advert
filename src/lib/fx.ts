import { countries, currencyLabel } from "@/lib/countries"

const nonAfricanTenderCodes = new Set(["CNY", "EUR", "GBP", "INR", "JPY", "USD", "ZWB"])

/** African-issued currencies represented by the board's Africa country data. */
export function boardCurrencyCodes(): string[] {
  const codes = new Set<string>()
  for (const country of countries) {
    for (const currency of country.currencies) {
      if (!nonAfricanTenderCodes.has(currency.code) && currency.name !== currency.code) codes.add(currency.code)
    }
  }
  return [...codes].sort((a, b) => a.localeCompare(b))
}

export function boardCurrencyOptions(): { code: string; label: string }[] {
  return [
    { code: "listing", label: "Original listing currency" },
    ...boardCurrencyCodes().map((code) => ({ code, label: currencyLabel(code) })),
  ]
}

export type FxRates = {
  base: string
  rates: Record<string, number>
  fetchedAt: string
}

export function convertAmount(
  amount: number,
  from: string,
  to: string,
  rates: Record<string, number>,
  base = "USD",
): number | null {
  if (!Number.isFinite(amount)) return null
  if (from === to) return amount
  const fromRate = from === base ? 1 : rates[from]
  const toRate = to === base ? 1 : rates[to]
  if (!fromRate || !toRate || fromRate <= 0 || toRate <= 0) return null
  // rates are "units of currency per 1 base"
  const inBase = amount / fromRate
  return inBase * toRate
}
