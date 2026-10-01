import { canonicalCountry } from "@/lib/countries"

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
