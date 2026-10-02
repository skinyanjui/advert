import { marketplacePolicy } from "@/lib/marketplace-policy"
import { isPubliclyVisibleListing } from "@/lib/listing-status"
import type { Listing } from "@/lib/types"

export const featuredPackage = marketplacePolicy.promotions
export const promotionStatuses = ["awaiting_payment", "pending", "active", "refund_pending", "refunded", "revoked", "expired", "cancelled"] as const
export const promotionEventTypes = ["impression", "click"] as const
export const promotionDisclosure = "Paid placement: the seller paid for priority in matching browse and search results. This is not an endorsement."

export function isFeatured(listing: Pick<Listing, "featured" | "featuredUntil" | "status" | "sold" | "hidden" | "expiresAt">, now = Date.now()): boolean {
  const end = Date.parse(listing.featuredUntil ?? "")
  return listing.featured === true && Number.isFinite(end) && end > now && isPubliclyVisibleListing(listing, now)
}

/** Only default relevance order is boosted; explicit price/date orders remain exact. */
export function prioritizeFeatured(listings: Listing[], now = Date.now()): Listing[] {
  return [...listings.filter(item => isFeatured(item, now)), ...listings.filter(item => !isFeatured(item, now))]
}

export type Promotion = {
  id: string
  listing_id: string
  owner_id: string
  status: (typeof promotionStatuses)[number]
  paid: boolean
  amount: number
  currency: string
  duration_days: number
  created_at: string
  starts_at: string | null
  ends_at: string | null
  decision_reason: string | null
  decisions?: { action: string; reason: string; created_at: string }[]
  impressions?: number
  clicks?: number
}

/** Stripe idempotency keys may be discarded after 24 hours. Never recreate a
 * checkout with an unknown outcome after that safety window. */
export function canCreatePromotionCheckout(createdAt: string, now = Date.now()): boolean {
  const created = Date.parse(createdAt)
  return Number.isFinite(created) && created <= now && now - created < 23 * 60 * 60 * 1000
}
