import { getCountry } from "@/lib/countries"
import { boardCurrencyCodes } from "@/lib/fx"
import { isLocale, type Locale } from "@/lib/i18n/locales"

export const languageStorageKey = "africa-classifieds-language"
export const currencyStorageKey = "africa-classifieds-currency"

/** Neutral fallback: show each listing in its stored currency instead of inventing a country. */
export const defaultCurrencyPreference = "listing" as const

export type CurrencyPreference = string

export function isLocalePreference(value: string | null | undefined): value is Locale {
  return isLocale(value)
}

export function isCurrencyPreference(value: string | null | undefined): value is CurrencyPreference {
  if (!value) return false
  return value === defaultCurrencyPreference || boardCurrencyCodes().includes(value)
}

export function currencyPreferenceForCountry(countryCode: string | null | undefined): CurrencyPreference {
  const allowed = new Set(boardCurrencyCodes())
  const local = getCountry(countryCode ?? "")?.currencies.find((currency) => allowed.has(currency.code))
  return local?.code ?? defaultCurrencyPreference
}

export function normalizeCurrencyPreference(
  value: string | null | undefined,
  countryCode?: string | null,
): CurrencyPreference {
  return isCurrencyPreference(value) ? value : currencyPreferenceForCountry(countryCode)
}

export function normalizeLanguagePreference(value: string | null | undefined): Locale {
  return isLocalePreference(value) ? value : "en"
}

/** Runs before paint so `<html lang>` matches the saved language. */
export const languageBootScript = `(function(){try{var l=localStorage.getItem(${JSON.stringify(languageStorageKey)});var ok=l==="en"||l==="fr"||l==="sw";document.documentElement.lang=ok?l:"en";}catch(e){document.documentElement.lang="en";}})();`
