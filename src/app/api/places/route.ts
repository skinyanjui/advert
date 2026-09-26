import { NextResponse } from "next/server"

import { nearestTimezone } from "@/lib/cities"
import { canonicalCountry } from "@/lib/countries"
import { readPlaceCache, writePlaceCache } from "@/lib/db"

export const dynamic = "force-dynamic"

type NominatimResult = {
  lat?: string
  lon?: string
  name?: string
  display_name?: string
  type?: string
  address?: {
    city?: string
    town?: string
    village?: string
    hamlet?: string
    suburb?: string
    neighbourhood?: string
    state?: string
    country_code?: string
  }
}

const placeTypes = new Set([
  "city",
  "town",
  "village",
  "hamlet",
  "suburb",
  "neighbourhood",
  "quarter",
  "city_district",
  "municipality",
  "administrative",
  "county",
  "locality",
  "borough",
  "district",
])

type PlaceHit = {
  name: string
  label: string
  lat: number
  lng: number
  timezone: string
  source: "nominatim"
}

const cacheMs = 10 * 60 * 1000
let lastRequest = 0
let gate: Promise<void> = Promise.resolve()

export async function GET(request: Request) {
  const url = new URL(request.url)
  const query = url.searchParams.get("q")?.trim() ?? ""
  const country = canonicalCountry(url.searchParams.get("country"))
  if (query.length < 2 || query.length > 80 || !country) {
    return NextResponse.json({ places: [] })
  }

  const key = `${country}|${query.toLowerCase()}`
  const cached = loadCache(key)
  if (cached) return NextResponse.json({ places: cached })

  try {
    const places = await schedule(async () => {
      const again = loadCache(key)
      if (again) return again
      const endpoint = new URL("https://nominatim.openstreetmap.org/search")
      endpoint.searchParams.set("format", "jsonv2")
      endpoint.searchParams.set("addressdetails", "1")
      endpoint.searchParams.set("limit", "5")
      endpoint.searchParams.set("countrycodes", country.toLowerCase())
      endpoint.searchParams.set("q", query)
      lastRequest = Date.now()
      const response = await fetch(endpoint, {
        headers: {
          Accept: "application/json",
          "Accept-Language": "en",
          "User-Agent": "africa-classifieds/0.1 (local classifieds demo)",
        },
        cache: "no-store",
      })
      if (!response.ok) return []
      const results = (await response.json()) as NominatimResult[]
      const hits = dedupePlaces(results.flatMap((result) => toPlace(result, country)))
      saveCache(key, hits)
      return hits
    })
    return NextResponse.json({ places })
  } catch {
    return NextResponse.json({ places: [] })
  }
}

function loadCache(key: string): PlaceHit[] | undefined {
  try {
    const raw = readPlaceCache(key, cacheMs)
    if (!raw) return undefined
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return undefined
    return parsed.flatMap((item) => (isPlaceHit(item) ? [item] : []))
  } catch {
    return undefined
  }
}

function saveCache(key: string, places: PlaceHit[]) {
  try {
    writePlaceCache(key, JSON.stringify(places))
  } catch {
    return
  }
}

function schedule<T>(task: () => Promise<T>): Promise<T> {
  const run = gate.then(async () => {
    const wait = 1100 - (Date.now() - lastRequest)
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))
    return task()
  })
  gate = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

function isPlaceHit(value: unknown): value is PlaceHit {
  if (!value || typeof value !== "object") return false
  const place = value as Partial<PlaceHit>
  return (
    typeof place.name === "string" &&
    typeof place.label === "string" &&
    typeof place.lat === "number" &&
    typeof place.lng === "number" &&
    typeof place.timezone === "string" &&
    place.source === "nominatim"
  )
}

function toPlace(result: NominatimResult, country: string): PlaceHit[] {
  if (result.type && !placeTypes.has(result.type)) return []
  const lat = Number(result.lat)
  const lng = Number(result.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return []
  const address = result.address
  const code = address?.country_code?.toUpperCase()
  if (code && code !== country) return []
  const name =
    result.name ||
    address?.suburb ||
    address?.neighbourhood ||
    address?.village ||
    address?.town ||
    address?.hamlet ||
    address?.city ||
    result.display_name?.split(",")[0] ||
    "Place"
  const region = address?.state
  const label = region ? `${name}, ${region}` : name
  return [
    {
      name,
      label,
      lat,
      lng,
      timezone: nearestTimezone(lat, lng, country),
      source: "nominatim",
    },
  ]
}

function dedupePlaces(places: PlaceHit[]): PlaceHit[] {
  const seen = new Set<string>()
  return places.filter((place) => {
    const key = place.name.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
