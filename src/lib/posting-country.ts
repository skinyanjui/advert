import { canonicalCountry } from "@/lib/countries"

/**
 * Resolve the country for a new post-an-ad form.
 * Priority: explicit post URL → saved onboarding/settings default → signed-in profile → none.
 * Temporary browsing location is a client-side fallback handled by the posting-place helpers.
 * Never invents a KE (or other) default.
 */
export function resolvePostingCountry(input: {
  urlCountry?: string | null
  savedPlaceCountry?: string | null
  profileCountry?: string | null
}): string {
  return (
    canonicalCountry(input.urlCountry) ??
    canonicalCountry(input.savedPlaceCountry) ??
    canonicalCountry(input.profileCountry) ??
    ""
  )
}
