import { canonicalCountry } from "@/lib/countries"
import { isBrowsingEverywhere, readHomePlace } from "@/lib/home-place"

const storageKey = "africa-classifieds-place"
const changeEvent = "africa-classifieds-place"

export type ActivePlace = {
  country: string
  city?: string
}

let cachedRaw: string | null | undefined
let cachedPlace: ActivePlace | null = null

function parseActive(raw: string | null): ActivePlace | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as { country?: unknown; city?: unknown }
    const country = canonicalCountry(typeof parsed.country === "string" ? parsed.country : undefined)
    if (!country) return null
    const city = typeof parsed.city === "string" ? parsed.city.trim() : ""
    return city ? { country, city } : { country }
  } catch {
    return null
  }
}

export function readActivePlace(): ActivePlace | null {
  if (typeof window === "undefined") return null
  const raw = sessionStorage.getItem(storageKey)
  if (raw === cachedRaw) return cachedPlace
  cachedRaw = raw
  cachedPlace = parseActive(raw)
  return cachedPlace
}

export function writeActivePlace(place: ActivePlace | null) {
  if (typeof window === "undefined") return
  const country = place ? canonicalCountry(place.country) : undefined
  const city = place?.city?.trim() ?? ""
  const next = country ? JSON.stringify(city ? { country, city } : { country }) : null
  const current = sessionStorage.getItem(storageKey)
  if ((current ?? null) === next) return
  if (next) sessionStorage.setItem(storageKey, next)
  else sessionStorage.removeItem(storageKey)
  cachedRaw = next
  cachedPlace = parseActive(next)
  window.dispatchEvent(new Event(changeEvent))
}

export function subscribeActivePlace(listener: () => void) {
  window.addEventListener(changeEvent, listener)
  window.addEventListener("storage", listener)
  return () => {
    window.removeEventListener(changeEvent, listener)
    window.removeEventListener("storage", listener)
  }
}

/** The place a new ad should use: saved onboarding/settings default, then temporary board selection. */
export function readPostingPlace(): { country: string; city: string } {
  const home = typeof window === "undefined" ? null : readHomePlace()
  if (home) return { country: home.country, city: home.city ?? "" }
  if (typeof window !== "undefined" && !isBrowsingEverywhere()) {
    const active = readActivePlace()
    if (active) return { country: active.country, city: active.city ?? "" }
  }
  // No invented default — post form may then use profile country or require a pick.
  return { country: "", city: "" }
}

export function postAdHref(
  place?: { country?: string; city?: string } | null,
  extra?: { category?: string; type?: string },
): string {
  const params = new URLSearchParams()
  const country = canonicalCountry(place?.country)
  if (country) {
    params.set("country", country)
    const city = place?.city?.trim() ?? ""
    if (city) params.set("city", city)
  }
  if (extra?.category) params.set("category", extra.category)
  if (extra?.type) params.set("type", extra.type)
  const qs = params.toString()
  return qs ? `/post?${qs}` : "/post"
}
