import { isListingExpired, isListingNeedingAttention } from "@/lib/expiry"
import { translate } from "@/lib/i18n"
import type { Locale } from "@/lib/i18n/locales"

export const listingStatuses = ["active", "paused", "sold", "expired"] as const

export type ListingStatus = (typeof listingStatuses)[number]

export type ListingStatusFilter = "all" | ListingStatus

const statusSet = new Set<string>(listingStatuses)

export function isListingStatus(value: unknown): value is ListingStatus {
  return typeof value === "string" && statusSet.has(value)
}

/** Effective status for UI/filters: time expiry wins over active/paused. */
export function effectiveListingStatus(
  listing: {
    status?: ListingStatus
    sold?: boolean
    expiresAt?: string
  },
  now = Date.now(),
): ListingStatus {
  if (listing.status === "sold" || listing.sold === true) return "sold"
  if (isListingExpired(listing.expiresAt, now) || listing.status === "expired") return "expired"
  if (listing.status === "paused") return "paused"
  return "active"
}

/**
 * Nav badge for My ads: only active ads that are expiring soon, or ads that
 * expired while still active. Sold and paused never contribute.
 */
export function listingNeedsMyAdsAttention(
  listing: {
    status?: ListingStatus
    sold?: boolean
    expiresAt?: string
  },
  now = Date.now(),
  withinDays = 3,
): boolean {
  if (listing.status === "sold" || listing.sold === true) return false
  if (listing.status === "paused") return false
  if (listing.status === "expired") return true
  return isListingNeedingAttention(listing.expiresAt, now, withinDays)
}

/** True when non-owners may see the ad on browse/search/detail. */
export function isPubliclyVisibleListing(
  listing: {
    status?: ListingStatus
    sold?: boolean
    hidden?: boolean
    expiresAt?: string
  },
  now = Date.now(),
): boolean {
  if (listing.hidden) return false
  return effectiveListingStatus(listing, now) === "active"
}

export function listingStatusLabel(status: ListingStatus, locale: Locale = "en"): string {
  switch (status) {
    case "active":
      return translate(locale, "status.active")
    case "paused":
      return translate(locale, "status.paused")
    case "sold":
      return translate(locale, "status.sold")
    case "expired":
      return translate(locale, "status.expired")
    default: {
      const _exhaustive: never = status
      return _exhaustive
    }
  }
}
