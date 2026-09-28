import { boardCurrencyCodes } from "@/lib/fx"
import { isLocale, type Locale } from "@/lib/i18n/locales"

export const languageStorageKey = "africa-classifieds-language"
export const currencyStorageKey = "africa-classifieds-currency"

/** Show each listing in the currency it was posted in. */
export const listingCurrencyPreference = "listing" as const

export type CurrencyPreference = typeof listingCurrencyPreference | string

export function isLocalePreference(value: string | null | undefined): value is Locale {
  return isLocale(value)
}

export function isCurrencyPreference(value: string | null | undefined): value is CurrencyPreference {
  if (!value) return false
  if (value === listingCurrencyPreference) return true
  return boardCurrencyCodes().includes(value)
}

export function normalizeCurrencyPreference(
  value: string | null | undefined,
): CurrencyPreference {
  return isCurrencyPreference(value) ? value : listingCurrencyPreference
}

export function normalizeLanguagePreference(value: string | null | undefined): Locale {
  return isLocalePreference(value) ? value : "en"
}

/** Runs before paint so `<html lang>` matches the saved language. */
export const languageBootScript = `(function(){try{var l=localStorage.getItem(${JSON.stringify(languageStorageKey)});var ok=l==="en"||l==="fr"||l==="sw";document.documentElement.lang=ok?l:"en";}catch(e){document.documentElement.lang="en";}})();`
