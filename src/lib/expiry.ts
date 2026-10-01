import { marketplacePolicy } from "@/lib/marketplace-policy"

export const listingLifetimeDays = marketplacePolicy.listing.lifetimeDays
export const expiryNoticeDays = marketplacePolicy.listing.expiryNoticeDays

export function expiresAtFrom(postedAt: Date | string = new Date()): string {
  const base = typeof postedAt === "string" ? new Date(postedAt) : postedAt
  const next = new Date(base.getTime())
  next.setUTCDate(next.getUTCDate() + listingLifetimeDays)
  return next.toISOString()
}

export function isListingExpired(expiresAt: string | undefined, now = Date.now()): boolean {
  if (!expiresAt) return false
  const time = new Date(expiresAt).getTime()
  if (Number.isNaN(time)) return false
  return time <= now
}

export function isListingExpiringSoon(
  expiresAt: string | undefined,
  now = Date.now(),
  withinDays: number = expiryNoticeDays,
): boolean {
  if (!expiresAt || isListingExpired(expiresAt, now)) return false
  const time = new Date(expiresAt).getTime()
  if (Number.isNaN(time)) return false
  const windowMs = withinDays * 24 * 60 * 60 * 1000
  return time - now <= windowMs
}

export function isListingNeedingAttention(
  expiresAt: string | undefined,
  now = Date.now(),
  withinDays: number = marketplacePolicy.listing.attentionNoticeDays,
): boolean {
  return isListingExpired(expiresAt, now) || isListingExpiringSoon(expiresAt, now, withinDays)
}

export function daysUntilExpiry(expiresAt: string | undefined, now = Date.now()): number | undefined {
  if (!expiresAt) return undefined
  const time = new Date(expiresAt).getTime()
  if (Number.isNaN(time)) return undefined
  return Math.ceil((time - now) / (24 * 60 * 60 * 1000))
}
