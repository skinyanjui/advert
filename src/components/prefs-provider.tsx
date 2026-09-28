"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react"

import { useAuth } from "@/lib/auth"
import { formatMoney, formatPrice } from "@/lib/format"
import { convertAmount, type FxRates } from "@/lib/fx"
import { offeredLocales, translate, type MessageKey, type TranslateValues } from "@/lib/i18n"
import { htmlLang, type Locale } from "@/lib/i18n/locales"
import {
  currencyStorageKey,
  languageStorageKey,
  listingCurrencyPreference,
  normalizeCurrencyPreference,
  normalizeLanguagePreference,
  type CurrencyPreference,
} from "@/lib/prefs"
import type { Listing } from "@/lib/types"

const languageEvent = "africa-classifieds-language"
const currencyEvent = "africa-classifieds-currency"

function readLanguage(): Locale {
  if (typeof window === "undefined") return "en"
  const stored = normalizeLanguagePreference(localStorage.getItem(languageStorageKey))
  return offeredLocales.includes(stored) ? stored : "en"
}

function readCurrency(): CurrencyPreference {
  if (typeof window === "undefined") return listingCurrencyPreference
  return normalizeCurrencyPreference(localStorage.getItem(currencyStorageKey))
}

function subscribeLanguage(listener: () => void) {
  window.addEventListener(languageEvent, listener)
  window.addEventListener("storage", listener)
  return () => {
    window.removeEventListener(languageEvent, listener)
    window.removeEventListener("storage", listener)
  }
}

function subscribeCurrency(listener: () => void) {
  window.addEventListener(currencyEvent, listener)
  window.addEventListener("storage", listener)
  return () => {
    window.removeEventListener(currencyEvent, listener)
    window.removeEventListener("storage", listener)
  }
}

export function applyLanguage(locale: Locale) {
  document.documentElement.lang = htmlLang(locale)
}

export function writeLanguageLocal(locale: Locale) {
  const next = offeredLocales.includes(locale) ? locale : "en"
  localStorage.setItem(languageStorageKey, next)
  applyLanguage(next)
  window.dispatchEvent(new Event(languageEvent))
}

export function writeCurrencyLocal(currency: CurrencyPreference) {
  localStorage.setItem(currencyStorageKey, normalizeCurrencyPreference(currency))
  window.dispatchEvent(new Event(currencyEvent))
}

export function useLanguagePreference(): Locale {
  return useSyncExternalStore(subscribeLanguage, readLanguage, () => "en")
}

export function useCurrencyPreference(): CurrencyPreference {
  return useSyncExternalStore(subscribeCurrency, readCurrency, () => listingCurrencyPreference)
}

type PrefsContextValue = {
  language: Locale
  currency: CurrencyPreference
  setLanguage: (locale: Locale) => void
  setCurrency: (currency: CurrencyPreference) => void
  fx: FxRates | null
  t: (key: MessageKey, values?: TranslateValues) => string
  formatListingPrice: (
    listing: Pick<Listing, "price" | "priceSuffix" | "currency">,
  ) => { primary: string; secondary?: string; approximate: boolean }
}

const PrefsContext = createContext<PrefsContextValue | null>(null)

export function PrefsProvider({ children }: { children: ReactNode }) {
  const language = useLanguagePreference()
  const currency = useCurrencyPreference()
  const auth = useAuth()
  const [fx, setFx] = useState<FxRates | null>(null)
  const t = useCallback(
    (key: MessageKey, values?: TranslateValues) => translate(language, key, values),
    [language],
  )

  useLayoutEffect(() => {
    applyLanguage(language)
  }, [language])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const response = await fetch("/api/fx")
        if (!response.ok) return
        const body = (await response.json()) as { ok?: boolean; rates?: FxRates }
        if (!cancelled && body.ok && body.rates) setFx(body.rates)
      } catch {
        /* silent: show listing currency */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!auth.ready || !auth.signedIn) return
    let cancelled = false
    void (async () => {
      try {
        const response = await fetch("/api/profile")
        if (!response.ok || cancelled) return
        const body = (await response.json()) as {
          ok?: boolean
          profile?: { language?: string | null; currency?: string | null }
        }
        if (!body.ok || !body.profile) return

        const profileLanguage = body.profile.language
          ? normalizeLanguagePreference(body.profile.language)
          : null
        const profileCurrency = body.profile.currency
          ? normalizeCurrencyPreference(body.profile.currency)
          : null

        // Signed-in profile is source of truth when it has a value.
        if (profileLanguage && offeredLocales.includes(profileLanguage)) {
          writeLanguageLocal(profileLanguage)
        }
        if (profileCurrency) {
          writeCurrencyLocal(profileCurrency)
        }

        // Push local prefs up when profile columns are still null.
        const patch: { language?: string; currency?: string } = {}
        if (!body.profile.language) patch.language = readLanguage()
        if (!body.profile.currency) patch.currency = readCurrency()
        if (Object.keys(patch).length > 0) {
          await fetch("/api/profile", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(patch),
          })
        }
      } catch {
        /* ignore */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [auth.ready, auth.signedIn])

  const persistToProfile = useCallback(
    async (patch: { language?: string; currency?: string }) => {
      if (!auth.signedIn) return
      try {
        await fetch("/api/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        })
      } catch {
        /* localStorage already updated */
      }
    },
    [auth.signedIn],
  )

  const setLanguage = useCallback(
    (locale: Locale) => {
      const next = offeredLocales.includes(locale) ? locale : "en"
      writeLanguageLocal(next)
      void persistToProfile({ language: next })
    },
    [persistToProfile],
  )

  const setCurrency = useCallback(
    (next: CurrencyPreference) => {
      const value = normalizeCurrencyPreference(next)
      writeCurrencyLocal(value)
      void persistToProfile({ currency: value })
    },
    [persistToProfile],
  )

  const formatListingPrice = useCallback(
    (listing: Pick<Listing, "price" | "priceSuffix" | "currency">) => {
      const original = formatPrice(listing)
      const listingCurrency = listing.currency ?? "USD"
      if (currency === listingCurrencyPreference || currency === listingCurrency) {
        return { primary: original, approximate: false }
      }
      if (!fx?.rates) return { primary: original, approximate: false }
      const converted = convertAmount(listing.price, listingCurrency, currency, fx.rates, fx.base)
      if (converted === null) return { primary: original, approximate: false }
      const money = formatMoney(converted, currency)
      const approx = listing.priceSuffix ? `${money} ${listing.priceSuffix}` : money
      return {
        primary: `≈ ${approx}`,
        secondary: original,
        approximate: true,
      }
    },
    [currency, fx],
  )

  const value = useMemo(
    () => ({
      language,
      currency,
      setLanguage,
      setCurrency,
      fx,
      t,
      formatListingPrice,
    }),
    [language, currency, setLanguage, setCurrency, fx, t, formatListingPrice],
  )

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>
}

export function usePrefs(): PrefsContextValue {
  const value = useContext(PrefsContext)
  if (!value) throw new Error("usePrefs must be used within PrefsProvider")
  return value
}

export function LanguageSync() {
  useLayoutEffect(() => {
    applyLanguage(readLanguage())
  }, [])
  return null
}
