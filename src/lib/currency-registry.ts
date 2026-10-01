import { countries } from "@/lib/countries"

const externalTenderCodes = new Set(["CNY", "EUR", "GBP", "INR", "JPY", "USD", "ZWB"])

export type CurrencyRegistryRecord = {
  code: string
  name: string
  symbol: string
  countries: readonly string[]
  boardDisplayAllowed: boolean
}

export function currencyRegistry(): CurrencyRegistryRecord[] {
  const map = new Map<string, { code: string; name: string; symbol: string; countries: string[] }>()
  for (const country of countries) {
    for (const currency of country.currencies) {
      const current = map.get(currency.code) ?? { ...currency, countries: [] }
      if (!current.countries.includes(country.code)) current.countries.push(country.code)
      map.set(currency.code, current)
    }
  }
  return [...map.values()]
    .map((currency) => ({
      ...currency,
      countries: currency.countries.sort(),
      boardDisplayAllowed: !externalTenderCodes.has(currency.code) && currency.name !== currency.code,
    }))
    .sort((a, b) => a.code.localeCompare(b.code))
}

export function boardDisplayCurrencyCodes(): string[] {
  return currencyRegistry().filter((currency) => currency.boardDisplayAllowed).map((currency) => currency.code)
}
