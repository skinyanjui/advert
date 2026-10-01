import { canonicalCountry } from "@/lib/countries"

export type MarketplacePlace = {
  country: string
  city?: string
}

function normalizePlace(place: MarketplacePlace | null | undefined): MarketplacePlace | null {
  const country = canonicalCountry(place?.country)
  if (!country) return null
  const city = place?.city?.trim() ?? ""
  return city ? { country, city } : { country }
}

/**
 * Resolve a new-post location.
 * Explicit action context wins. For signed-in users, the server profile wins
 * over device-local state. Anonymous users can fall back to device and browse state.
 */
export function resolvePostingLocation(input: {
  explicit?: MarketplacePlace | null
  profile?: MarketplacePlace | null
  device?: MarketplacePlace | null
  active?: MarketplacePlace | null
  signedIn?: boolean
  browsingEverywhere?: boolean
}): MarketplacePlace | null {
  const explicit = normalizePlace(input.explicit)
  if (explicit) return explicit
  const profile = normalizePlace(input.profile)
  if (input.signedIn && profile) return profile
  const device = normalizePlace(input.device)
  if (device) return device
  if (!input.browsingEverywhere) return normalizePlace(input.active)
  return null
}
