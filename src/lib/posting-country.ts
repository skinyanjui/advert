import { canonicalCountry, getCountry } from "@/lib/countries"
import type { PostDraft } from "@/lib/post-draft"
import { currencyPreferenceForCountry, defaultCurrencyPreference, isCurrencyPreference } from "@/lib/prefs"

/**
 * Resolve the country for a new post.
 * Explicit action context wins. Signed-in profile is authoritative; device state
 * is a bootstrap/fallback only. Never invents a country.
 */
export function resolvePostingCountry(input: {
  urlCountry?: string | null
  profileCountry?: string | null
  savedPlaceCountry?: string | null
}): string {
  return (
    canonicalCountry(input.urlCountry) ??
    canonicalCountry(input.profileCountry) ??
    canonicalCountry(input.savedPlaceCountry) ??
    ""
  )
}

export type PostingDraftLocation = Pick<PostDraft,
  "country" | "currency" | "city" | "locationDetail" | "locationPrecision" |
  "latitude" | "longitude" | "timezone"
> & { locationSource: "default" | "chosen" }

/** An inherited draft default must not become a permanent posting preference. */
export function resolvePostingDraftLocation(input: {
  draft?: PostDraft | null
  defaultCountry?: string | null
  defaultCity?: string | null
  urlCountry?: string | null
  urlCity?: string | null
}): PostingDraftLocation {
  const draft = input.draft
  const explicitCountry = canonicalCountry(input.urlCountry)
  const draftCountry = canonicalCountry(draft?.country)
  const draftCity = draft?.city ?? ""
  const chosenDraft = !!draftCountry && draft?.locationSource === "chosen"
  const country = explicitCountry ?? (chosenDraft ? draftCountry : canonicalCountry(input.defaultCountry)) ?? ""
  const city = explicitCountry
    ? input.urlCity?.trim() || (draftCountry === country && chosenDraft ? draftCity : "")
    : chosenDraft ? draftCity : country ? input.defaultCity?.trim() ?? "" : ""
  const preserveLocation = chosenDraft && draftCountry === country && draftCity === city
  const localCurrency = currencyPreferenceForCountry(country)
  const keepCurrency = draftCountry === country && isCurrencyPreference(draft?.currency) &&
    getCountry(country)?.currencies.some((item) => item.code === draft?.currency)

  return {
    country,
    city,
    currency: keepCurrency ? draft?.currency ?? "" : localCurrency === defaultCurrencyPreference ? "" : localCurrency,
    locationSource: explicitCountry || chosenDraft ? "chosen" : "default",
    locationDetail: preserveLocation ? draft?.locationDetail ?? "" : "",
    locationPrecision: preserveLocation ? draft?.locationPrecision ?? "city" : "city",
    latitude: preserveLocation ? draft?.latitude : undefined,
    longitude: preserveLocation ? draft?.longitude : undefined,
    timezone: preserveLocation ? draft?.timezone : undefined,
  }
}
