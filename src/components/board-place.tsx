"use client"

import { useEffect, useState } from "react"

import { Input } from "@/components/ui/input"
import { countryName } from "@/lib/countries"
import { osmLinks } from "@/lib/map"

type PlaceHit = {
  name: string
  lat: number
  lng: number
  timezone: string
  source?: "geonames" | "nominatim"
}

export function BoardCitySearch({
  country,
  city,
  onSelect,
}: {
  country: string
  city?: string
  onSelect: (city: string | null) => void
}) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState("")
  const [remote, setRemote] = useState<{ key: string; places: PlaceHit[] }>({ key: "", places: [] })
  const value = open ? draft : (city ?? "")
  const query = value.trim()
  const key = `${country}|${query.toLowerCase()}`
  const suggestions = remote.key === key ? remote.places : []

  useEffect(() => {
    if (!open || query.length < 2) return
    const handle = window.setTimeout(() => {
      const params = new URLSearchParams({ q: query, country })
      const nextKey = `${country}|${query.toLowerCase()}`
      Promise.all([
        fetch(`/api/cities?${params}`).then((response) => (response.ok ? response.json() : { places: [] })),
        fetch(`/api/places?${params}`).then((response) => (response.ok ? response.json() : { places: [] })),
      ])
        .then(([local, mapped]: [{ places?: PlaceHit[] }, { places?: PlaceHit[] }]) => {
          const geonames = (local.places ?? []).map((place) => ({ ...place, source: "geonames" as const }))
          const nominatim = (mapped.places ?? []).map((place) => ({ ...place, source: "nominatim" as const }))
          setRemote({ key: nextKey, places: mergePlaces(geonames, nominatim) })
        })
        .catch(() => setRemote({ key: nextKey, places: [] }))
    }, 200)
    return () => window.clearTimeout(handle)
  }, [open, query, country])

  return (
    <div className="relative w-full sm:w-56">
      <Input
        value={value}
        onChange={(event) => {
          setDraft(event.target.value)
          setOpen(true)
        }}
        onFocus={() => {
          setDraft(city ?? "")
          setOpen(true)
        }}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 150)
        }}
        placeholder={`City in ${countryName(country)}`}
        aria-label={`Search cities in ${countryName(country)}`}
        aria-autocomplete="list"
        aria-expanded={open && suggestions.length > 0}
        role="combobox"
        className="h-8 rounded-full bg-white pr-8 text-xs"
      />
      {city && !open ? (
        <button
          type="button"
          aria-label="Clear city"
          className="absolute top-1/2 right-2 -translate-y-1/2 px-1 text-sm text-neutral-400 hover:text-neutral-900"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onSelect(null)}
        >
          ×
        </button>
      ) : null}
      {open && suggestions.length > 0 ? (
        <ul className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-lg border bg-white p-1 shadow-md">
          {suggestions.map((place) => (
            <li key={`${place.source ?? "geonames"}-${place.name}-${place.lat}`}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left text-sm hover:bg-neutral-100"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onSelect(place.name)
                  setDraft(place.name)
                  setOpen(false)
                }}
              >
                <span className="truncate">{place.name}</span>
                <span className="shrink-0 text-[11px] text-neutral-400">
                  {place.source === "nominatim" ? "Map" : "GeoNames"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export function CityMap({ country, city }: { country: string; city: string }) {
  const [resolved, setResolved] = useState<{ key: string; place: PlaceHit | null }>({
    key: "",
    place: null,
  })
  const key = `${country}|${city}`
  const place = resolved.key === key ? resolved.place : null

  useEffect(() => {
    const params = new URLSearchParams({ country, q: city, exact: "1" })
    let cancel = false
    fetch(`/api/cities?${params}`)
      .then((response) => (response.ok ? response.json() : { places: [] }))
      .then((data: { places?: PlaceHit[] }) => {
        if (!cancel) setResolved({ key, place: data.places?.[0] ?? null })
      })
      .catch(() => {
        if (!cancel) setResolved({ key, place: null })
      })
    return () => {
      cancel = true
    }
  }, [country, city, key])

  if (!place) return null
  const links = osmLinks(place.lat, place.lng)
  return (
    <div className="mb-4 overflow-hidden rounded-2xl border border-neutral-200 bg-white">
      <iframe title={`Map of ${place.name}`} src={links.embed} className="h-40 w-full" loading="lazy" />
      <a
        href={links.external}
        target="_blank"
        rel="noreferrer"
        className="block border-t px-3 py-2 text-xs text-neutral-500 hover:text-neutral-900"
      >
        Open {place.name} in OpenStreetMap
      </a>
    </div>
  )
}

function mergePlaces(local: PlaceHit[], remote: PlaceHit[]): PlaceHit[] {
  const seen = new Set(local.map((place) => place.name.toLowerCase()))
  const extra = remote.filter((place) => !seen.has(place.name.toLowerCase()))
  return [...local, ...extra].slice(0, 8)
}
