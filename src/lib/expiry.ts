export const listingLifetimeDays = 60
export const expiryNoticeDays = 7

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

/** True when the ad is still live but within the notice window. */
export function isListingExpiringSoon(expiresAt: string | undefined, now = Date.now()): boolean {
  if (!expiresAt || isListingExpired(expiresAt, now)) return false
  const time = new Date(expiresAt).getTime()
  if (Number.isNaN(time)) return false
  const windowMs = expiryNoticeDays * 24 * 60 * 60 * 1000
  return time - now <= windowMs
}

export function daysUntilExpiry(expiresAt: string | undefined, now = Date.now()): number | undefined {
  if (!expiresAt) return undefined
  const time = new Date(expiresAt).getTime()
  if (Number.isNaN(time)) return undefined
  return Math.ceil((time - now) / (24 * 60 * 60 * 1000))
}
