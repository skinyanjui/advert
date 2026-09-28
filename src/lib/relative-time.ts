import { formatPosted, hoursAgoOf } from "@/lib/format"
import type { Listing } from "@/lib/types"

export { hoursAgoOf }

/**
 * Compact relative posting time for listing cards and detail meta.
 * Examples: "Just now", "Posted 3h ago", "Posted 1d ago", "Posted 2w ago".
 */
export function formatRelativePosted(hoursAgo: number): string {
  if (!Number.isFinite(hoursAgo) || hoursAgo < 0) return "Just now"
  if (hoursAgo < 1) return "Just now"
  if (hoursAgo < 24) {
    const hours = Math.max(1, Math.round(hoursAgo))
    return `Posted ${hours}h ago`
  }
  const days = hoursAgo / 24
  if (days < 7) {
    const rounded = Math.max(1, Math.round(days))
    return `Posted ${rounded}d ago`
  }
  const weeks = days / 7
  if (weeks < 5) {
    const rounded = Math.max(1, Math.round(weeks))
    return `Posted ${rounded}w ago`
  }
  const months = Math.max(1, Math.round(days / 30))
  return `Posted ${months}mo ago`
}

/** Relative time for inbox message timestamps (uses formatPosted, not "Posted …"). */
export function formatMessageWhen(sentAt: string, now = Date.now()): string {
  const time = new Date(sentAt).getTime()
  return Number.isNaN(time) ? "" : formatPosted((now - time) / 3_600_000)
}

/** Absolute calendar date for tooltips / detail pages when an ISO timestamp exists. */
export function formatPostedDate(postedAt: string | undefined, locale = "en"): string | undefined {
  if (!postedAt) return undefined
  const date = new Date(postedAt)
  if (Number.isNaN(date.getTime())) return undefined
  return date.toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

/** ISO datetime string for `<time dateTime>`, or undefined when only relative hours are known. */
export function postedDateTime(listing: Pick<Listing, "postedAt">): string | undefined {
  if (!listing.postedAt) return undefined
  const date = new Date(listing.postedAt)
  if (Number.isNaN(date.getTime())) return undefined
  return date.toISOString()
}

/** Compact relative label for a listing, using a caller-supplied `now` for stable SSR. */
export function relativePostedLabel(
  listing: Pick<Listing, "hoursAgo" | "postedAt">,
  now = Date.now(),
): string {
  return formatRelativePosted(hoursAgoOf(listing, now))
}
