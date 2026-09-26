import { NextResponse } from "next/server"

import { nearestTimezone } from "@/lib/cities"
import { canonicalCountry } from "@/lib/countries"

export const dynamic = "force-dynamic"

type NominatimResult = {
  lat?: string
  lon?: string
  name?: string
  display_name?: string
  address?: {
    city?: string
    town?: string
    village?: string
    hamlet?: string
    suburb?: string
    state?: string
    country_code?: string
  }
}

type PlaceHit = {
  name: string
  label: string
  lat: number
  lng: number
  timezone: string
  source: "nominatim"
}

const cache = new Map<string, { at: number; places: PlaceHit[] }>()
let lastRequest = 0

export async function GET(request: Request) {
  const url = new URL(request.url)
  const query = url.searchParams.get("q")?.trim() ?? ""
  const country = canonicalCountry(url.searchParams.get("country"))
  if (query.length < 2 || !country) {
    return NextResponse.json({ places: [] })
  }

  const key = `${country}|${query.toLowerCase()}`
  const cached = cache.get(key)
  if (cached && Date.now() - cached.at < 10 * 60 * 1000) {
    return NextResponse.json({ places: cached.places })
  }

  const wait = 1100 - (Date.now() - lastRequest)
  if (wait > 0) {
    if (cached) return NextResponse.json({ places: cached.places })
    return NextResponse.json({ places: [], throttled: true })
  }

  const endpoint = new URL("https://nominatim.openstreetmap.org/search")
  endpoint.searchParams.set("format", "jsonv2")
  endpoint.searchParams.set("addressdetails", "1")
  endpoint.searchParams.set("limit", "5")
  endpoint.searchParams.set("countrycodes", country.toLowerCase())
  endpoint.searchParams.set("q", query)

  try {
    lastRequest = Date.now()
    const response = await fetch(endpoint, {
      headers: {
        Accept: "application/json",
        "Accept-Language": "en",
        "User-Agent": "africa-classifieds/0.1 (local classifieds demo)",
      },
      cache: "no-store",
    })
    if (!response.ok) {
      return NextResponse.json({ places: [] })
    }
    const results = (await response.json()) as NominatimResult[]
    const places = results.flatMap((result) => toPlace(result, country))
    cache.set(key, { at: Date.now(), places })
    return NextResponse.json({ places })
  } catch {
    return NextResponse.json({ places: [] })
  }
}

function toPlace(result: NominatimResult, country: string): PlaceHit[] {
  const lat = Number(result.lat)
  const lng = Number(result.lon)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return []
  const address = result.address
  const name =
    address?.city ||
    address?.town ||
    address?.village ||
    address?.suburb ||
    address?.hamlet ||
    result.name ||
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
