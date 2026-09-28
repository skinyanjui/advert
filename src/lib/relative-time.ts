import { hoursAgoOf } from "@/lib/format"
import { translate } from "@/lib/i18n"
import { htmlLang, type Locale } from "@/lib/i18n/locales"
import type { Listing } from "@/lib/types"

export { hoursAgoOf }

/**
 * Compact relative posting time for listing cards and detail meta.
 * Examples: "Just now", "Posted 3h ago", "Posted 1d ago", "Posted 2w ago".
 */
export function formatRelativePosted(hoursAgo: number, locale: Locale = "en"): string {
  if (!Number.isFinite(hoursAgo) || hoursAgo < 0) return translate(locale, "time.justNow")
  if (hoursAgo < 1) return translate(locale, "time.justNow")
  if (hoursAgo < 24) {
    const hours = Math.max(1, Math.round(hoursAgo))
    return translate(locale, "time.postedHoursAgo", { count: hours })
  }
  const days = hoursAgo / 24
  if (days < 7) {
    const rounded = Math.max(1, Math.round(days))
    return translate(locale, "time.postedDaysAgo", { count: rounded })
  }
  const weeks = days / 7
  if (weeks < 5) {
    const rounded = Math.max(1, Math.round(weeks))
    return translate(locale, "time.postedWeeksAgo", { count: rounded })
  }
  const months = Math.max(1, Math.round(days / 30))
  return translate(locale, "time.postedMonthsAgo", { count: months })
}

/** Relative time for inbox message timestamps (uses formatPosted, not "Posted …"). */
export function formatMessageWhen(sentAt: string, locale: Locale = "en", now = Date.now()): string {
  const time = new Date(sentAt).getTime()
  if (Number.isNaN(time)) return ""
  const hoursAgo = (now - time) / 3_600_000
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

/** Absolute calendar date for tooltips / detail pages when an ISO timestamp exists. */
export function formatPostedDate(postedAt: string | undefined, locale: Locale = "en"): string | undefined {
  if (!postedAt) return undefined
  const date = new Date(postedAt)
  if (Number.isNaN(date.getTime())) return undefined
  return date.toLocaleDateString(htmlLang(locale), {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

/** Short month+day for notification stamps. */
export function formatShortDate(iso: string | undefined, locale: Locale = "en"): string | undefined {
  if (!iso) return undefined
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return undefined
  return date.toLocaleDateString(htmlLang(locale), {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
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
  locale: Locale = "en",
): string {
  return formatRelativePosted(hoursAgoOf(listing, now), locale)
}
