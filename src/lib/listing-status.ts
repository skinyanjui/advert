import { isListingExpired } from "@/lib/expiry"

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

export function listingStatusLabel(status: ListingStatus): string {
  switch (status) {
    case "active":
      return "Active"
    case "paused":
      return "Paused"
    case "sold":
      return "Sold"
    case "expired":
      return "Expired"
    default: {
      const _exhaustive: never = status
      return _exhaustive
    }
  }
}
