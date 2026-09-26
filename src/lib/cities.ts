import citiesData from "@/data/cities.json"

import { fold, getCountry } from "@/lib/countries"

export { fold }

export type CityRecord = {
  id: number
  name: string
  country: string
  lat: number
  lng: number
  pop: number
  tz: string
}

export type ResolvedPlace = {
  name: string
  lat: number
  lng: number
  timezone: string
  matched: boolean
}

export const cities = citiesData as CityRecord[]

const byCountry = new Map<string, CityRecord[]>()
const byName = new Map<string, CityRecord>()

for (const city of cities) {
  const list = byCountry.get(city.country)
  if (list) list.push(city)
  else byCountry.set(city.country, [city])
  const key = `${city.country}|${fold(city.name)}`
  const existing = byName.get(key)
  if (!existing || city.pop > existing.pop) byName.set(key, city)
}

export function searchCities(country: string, query: string, limit = 8): CityRecord[] {
  const list = byCountry.get(country) ?? []
  const needle = fold(query)
  if (!needle) return list.slice(0, limit)
  const matches = list.filter((city) => fold(city.name).includes(needle))
  matches.sort((a, b) => {
    const aStart = fold(a.name).startsWith(needle) ? 0 : 1
    const bStart = fold(b.name).startsWith(needle) ? 0 : 1
    if (aStart !== bStart) return aStart - bStart
    return b.pop - a.pop
  })
  return matches.slice(0, limit)
}

export function resolvePlace(country: string, cityName: string): ResolvedPlace {
  const countryRecord = getCountry(country)
  const match = byName.get(`${country}|${fold(cityName)}`)
  if (match) {
    return {
      name: match.name,
      lat: match.lat,
      lng: match.lng,
      timezone: match.tz,
      matched: true,
    }
  }
  return {
    name: cityName,
    lat: countryRecord?.lat ?? 0,
    lng: countryRecord?.lng ?? 0,
    timezone: countryRecord?.timezone ?? "Africa/Abidjan",
    matched: false,
  }
}

export function nearestTimezone(lat: number, lng: number, country: string): string {
  const list = byCountry.get(country) ?? []
  let best = getCountry(country)?.timezone ?? "Africa/Abidjan"
  let bestDistance = Number.POSITIVE_INFINITY
  for (const city of list) {
    const distance = (city.lat - lat) ** 2 + (city.lng - lng) ** 2
    if (distance < bestDistance) {
      bestDistance = distance
      best = city.tz
    }
  }
  return best
}
