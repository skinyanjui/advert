import { canonicalCountry } from "@/lib/countries"

/**
 * Resolve the country for a new post-an-ad form.
 * Priority: URL → saved board/home place → signed-in profile → none (seller must pick).
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
