import { htmlLang, type Locale } from "@/lib/i18n/locales"
import { translate, type MessageKey, type TranslateValues } from "@/lib/i18n"
import { canonicalCountry, countryName } from "@/lib/countries"
import { site } from "@/lib/site"
import type { Listing } from "@/lib/types"

export function formatMoney(amount: number, currency = "USD", locale: Locale = "en"): string {
  const tag = htmlLang(locale)
  try {
    return new Intl.NumberFormat(tag, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${currency} ${Math.round(amount).toLocaleString(tag)}`
  }
}

export function formatPrice(
  listing: Pick<Listing, "price" | "priceSuffix" | "currency">,
  locale: Locale = "en",
): string {
  const money = formatMoney(listing.price, listing.currency ?? "USD", locale)
  return listing.priceSuffix ? `${money} ${listing.priceSuffix}` : money
}

export function hoursAgoOf(listing: Pick<Listing, "hoursAgo" | "postedAt">, now = Date.now()): number {
  if (!listing.postedAt) return listing.hoursAgo
  const posted = new Date(listing.postedAt).getTime()
  if (Number.isNaN(posted)) return listing.hoursAgo
  return Math.max(0, (now - posted) / 3_600_000)
}

export function formatPosted(hoursAgo: number, locale: Locale = "en"): string {
  if (hoursAgo < 1) return translate(locale, "time.justNow")
  if (hoursAgo < 24) {
    const hours = Math.max(1, Math.round(hoursAgo))
    return hours === 1
      ? translate(locale, "time.hourAgo")
      : translate(locale, "time.hoursAgo", { count: hours })
  }
  const days = Math.max(1, Math.round(hoursAgo / 24))
  return days === 1
    ? translate(locale, "time.dayAgo")
    : translate(locale, "time.daysAgo", { count: days })
}

export function formatPlace(listing: Pick<Listing, "city" | "country">): string {
  return `${listing.city}, ${countryName(listing.country)}`
}

/** Optional city + country label (e.g. home place or board filter). */
export function formatPlaceLabel(country: string, city?: string): string {
  const name = countryName(country)
  const trimmed = city?.trim()
  return trimmed ? `${trimmed}, ${name}` : name
}

/** Card-friendly place: full city name + ISO-2 country code, e.g. "Dar es Salaam, TZ". */
export function formatPlaceCompact(listing: Pick<Listing, "city" | "country">): string {
  const code = canonicalCountry(listing.country) ?? listing.country.toUpperCase()
  return `${listing.city}, ${code}`
}

export function countryCodeOf(listing: Pick<Listing, "country">): string {
  return canonicalCountry(listing.country) ?? listing.country.toUpperCase()
}

export function formatDistance(km: number, locale: Locale = "en"): string | undefined {
  if (!Number.isFinite(km) || km < 1) return undefined
  return translate(locale, "format.distanceKm", { count: Math.round(km) })
}

export function formatCount(count: number, locale: Locale = "en"): string {
  if (count < 1000) return String(count)
  const compact = count / 1000
  const digits = compact >= 10 ? 0 : 1
  const value = compact.toFixed(digits).replace(/\.0$/, "")
  return translate(locale, "format.countThousands", { value })
}

export function whatsappHref(phone: string, title: string, listingId?: string, locale: Locale = "en"): string {
  const digits = phone.replace(/[^\d]/g, "")
  const hello = translate(locale, "format.whatsappHello", { title, site: site.name })
  const message = listingId ? `${hello}\nListing ${listingId}` : hello
  const text = encodeURIComponent(message)
  return `https://wa.me/${digits}?text=${text}`
}

export function initials(name: string): string {
  const parts = name.split(" ").filter(Boolean)
  const letters = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "")
  return letters.join("") || "AC"
}

export type TranslateFn = (key: MessageKey, values?: TranslateValues) => string
