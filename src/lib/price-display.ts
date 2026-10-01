import { formatMoney } from "@/lib/format"
import { convertAmount, type FxRates } from "@/lib/fx"
import type { Locale } from "@/lib/i18n/locales"
import { currencyPreferenceForCountry, defaultCurrencyPreference } from "@/lib/prefs"
import type { Listing } from "@/lib/types"

export function listingPriceDisplay(
  listing: Pick<Listing, "price" | "priceSuffix" | "currency" | "country">,
  input: { currency: string; marketCountry?: string; rates?: FxRates | null; locale?: Locale },
) {
  const originalCurrency = listing.currency ?? currencyPreferenceForCountry(listing.country)
  const localCurrency = currencyPreferenceForCountry(input.marketCountry ?? listing.country)
  const target = input.currency === defaultCurrencyPreference
    ? localCurrency === defaultCurrencyPreference ? originalCurrency : localCurrency
    : input.currency
  const amount = target === originalCurrency
    ? listing.price
    : input.rates ? convertAmount(listing.price, originalCurrency, target, input.rates.rates, input.rates.base) : null
  const currency = amount === null ? originalCurrency : target
  const money = formatMoney(amount ?? listing.price, currency, input.locale)
  const price = listing.priceSuffix ? `${money} ${listing.priceSuffix}` : money
  const approximate = amount !== null && target !== originalCurrency
  return {
    primary: approximate ? `≈ ${price}` : price,
    approximate,
    currency,
    conversionUnavailable: amount === null,
  }
}
