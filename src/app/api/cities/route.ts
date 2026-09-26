import { NextResponse } from "next/server"

import { resolvePlace, searchCities } from "@/lib/cities"
import { canonicalCountry } from "@/lib/countries"

export const dynamic = "force-dynamic"

type CityHit = {
  name: string
  lat: number
  lng: number
  timezone: string
  source: "geonames"
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const country = canonicalCountry(url.searchParams.get("country"))
  const query = url.searchParams.get("q")?.trim() ?? ""
  const exact = url.searchParams.get("exact") === "1"
  if (!country || query.length < 1 || query.length > 80) {
    return NextResponse.json({ places: [] })
  }

  if (exact) {
    const place = resolvePlace(country, query)
    if (!place.matched) return NextResponse.json({ places: [] })
    const hit: CityHit = {
      name: place.name,
      lat: place.lat,
      lng: place.lng,
      timezone: place.timezone,
      source: "geonames",
    }
    return NextResponse.json({ places: [hit] })
  }

  const places: CityHit[] = searchCities(country, query, 6).map((city) => ({
    name: city.name,
    lat: city.lat,
    lng: city.lng,
    timezone: city.tz,
    source: "geonames",
  }))
  return NextResponse.json({ places })
}
