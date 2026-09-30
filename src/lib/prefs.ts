import { boardCurrencyCodes } from "@/lib/fx"
import { isLocale, type Locale } from "@/lib/i18n/locales"

export const languageStorageKey = "africa-classifieds-language"
export const currencyStorageKey = "africa-classifieds-currency"
export const defaultCurrencyPreference = "KES" as const

export type CurrencyPreference = string

export function isLocalePreference(value: string | null | undefined): value is Locale {
  return isLocale(value)
}

export function isCurrencyPreference(value: string | null | undefined): value is CurrencyPreference {
  if (!value) return false
  return boardCurrencyCodes().includes(value)
}

export function normalizeCurrencyPreference(
  value: string | null | undefined,
): CurrencyPreference {
  return isCurrencyPreference(value) ? value : defaultCurrencyPreference
}

export function normalizeLanguagePreference(value: string | null | undefined): Locale {
  return isLocalePreference(value) ? value : "en"
}

/** Runs before paint so `<html lang>` matches the saved language. */
export const languageBootScript = `(function(){try{var l=localStorage.getItem(${JSON.stringify(languageStorageKey)});var ok=l==="en"||l==="fr"||l==="sw";document.documentElement.lang=ok?l:"en";}catch(e){document.documentElement.lang="en";}})();`
