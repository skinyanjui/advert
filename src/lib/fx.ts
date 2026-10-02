import { currencyLabel } from "@/lib/countries"
import { boardDisplayCurrencyCodes } from "@/lib/currency-registry"

/** Display currencies allowed by the authoritative currency registry. */
export function boardCurrencyCodes(): string[] {
  return boardDisplayCurrencyCodes()
}

export function boardCurrencyOptions(): { code: string; label: string }[] {
  return [
    { code: "listing", label: "Follow selected country" },
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
  if (!Number.isFinite(fromRate) || !Number.isFinite(toRate) || fromRate <= 0 || toRate <= 0) return null
  // rates are "units of currency per 1 base"
  const inBase = amount / fromRate
  const converted = inBase * toRate
  return Number.isFinite(converted) ? converted : null
}
