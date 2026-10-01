"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import { Input } from "@/components/ui/input"
import { resolvePlace, searchCities } from "@/lib/cities"
import { countryName, fold } from "@/lib/countries"

type PlaceSource = "listed" | "geonames"

type PlaceHit = {
  name: string
  lat: number
  lng: number
  timezone: string
  source?: PlaceSource
  count?: number
}

type ListedCity = {
  name: string
  count: number
}

export function BoardCitySearch({
  country,
  city,
  places,
  onSelect,
}: {
  country: string
  city?: string
  places: ListedCity[]
  onSelect: (city: string | null) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState("")
  const [remote, setRemote] = useState<{ key: string; places: PlaceHit[] }>({ key: "", places: [] })
  const value = open ? draft : (city ?? "")
  const query = draft.trim()
  const local = useMemo(() => listedAndKnownCities(country, query, places), [country, query, places])
  const key = `${country}|${query}`
  const suggestions = open ? (remote.key === key
    ? mergePlaces(local.filter((place) => place.source === "listed"), remote.places)
    : local) : []

  useEffect(() => {
    if (!open || query.length < 2) return
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: query, country })
        const response = await fetch(`/api/reference/cities?${params}`, { signal: controller.signal })
        if (!response.ok) return
        const payload = (await response.json()) as { places?: PlaceHit[] }
        setRemote({ key, places: (payload.places ?? []).map((place) => ({ ...place, source: "geonames" })) })
      } catch { /* Bundled cities remain available. */ }
    }, 250)
    return () => { controller.abort(); window.clearTimeout(timer) }
  }, [open, query, country, key])

  function begin() {
    if (open) return
    setDraft("")
    setOpen(true)
  }

  function pick(name: string) {
    onSelect(name)
    setDraft(name)
    setOpen(false)
    inputRef.current?.blur()
  }

  return (
    <div className="relative w-full sm:w-56">
      <Input
        ref={inputRef}
        value={value}
        onChange={(event) => {
          setDraft(event.target.value)
          setOpen(true)
        }}
        onClick={begin}
        onFocus={begin}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 150)
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false)
            return
          }
          if (event.key !== "Enter" || !open) return
          event.preventDefault()
          const exact = suggestions.find((place) => fold(place.name) === fold(query))
          const next = exact ?? suggestions[0]
          if (next) pick(next.name)
        }}
        placeholder={`City in ${countryName(country)}`}
        aria-label={`Search cities in ${countryName(country)}`}
        aria-autocomplete="list"
        aria-expanded={open && (suggestions.length > 0 || query.length >= 2)}
        aria-controls="board-city-list"
        role="combobox"
        className="h-11 rounded-full border-input bg-background pr-11 text-base shadow-none sm:h-8 sm:pr-8 sm:text-xs"
      />
      {city && !open ? (
        <button
          type="button"
          aria-label="Clear city"
          className="absolute top-1/2 right-0 flex size-11 -translate-y-1/2 items-center justify-center rounded-full text-base text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:right-1 sm:size-8 sm:text-sm"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onSelect(null)}
        >
          ×
        </button>
      ) : null}
      {open && suggestions.length > 0 ? (
        <ul id="board-city-list" role="listbox" className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-md">
          {suggestions.map((place) => (
            <li key={`${place.source ?? "geonames"}-${place.name}-${place.lat}`} role="option" aria-selected={fold(place.name) === fold(city ?? "")}>
              <button
                type="button"
                className="flex min-h-11 w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring sm:min-h-0 sm:py-1.5"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => pick(place.name)}
              >
                <span className="truncate">{place.name}</span>
                <span className="shrink-0 text-[11px] text-muted-foreground">{placeLabel(place)}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {open && query.length >= 2 && suggestions.length === 0 ? (
        <p className="absolute z-30 mt-1 w-full rounded-lg border border-border bg-popover px-3 py-2 text-sm text-muted-foreground shadow-md">
          No cities match
        </p>
      ) : null}
    </div>
  )
}

function listedAndKnownCities(country: string, query: string, listed: ListedCity[]): PlaceHit[] {
  const needle = fold(query)
  const fromAds: PlaceHit[] = listed.flatMap((city) => {
    if (needle && !fold(city.name).includes(needle)) return []
    const resolved = resolvePlace(country, city.name)
    return [
      {
        name: city.name,
        lat: resolved.lat,
        lng: resolved.lng,
        timezone: resolved.timezone,
        source: "listed" as const,
        count: city.count,
      },
    ]
  })
  const fromGeo: PlaceHit[] = needle
    ? searchCities(country, query, 6).map((city) => ({
        name: city.name,
        lat: city.lat,
        lng: city.lng,
        timezone: city.tz,
        source: "geonames" as const,
      }))
    : []
  return mergePlaces(fromAds, fromGeo)
}

function placeLabel(place: PlaceHit): string {
  if (place.count) return String(place.count)
  return "GeoNames"
}

function mergePlaces(local: PlaceHit[], remote: PlaceHit[]): PlaceHit[] {
  const seen = new Set(local.map((place) => fold(place.name)))
  const extra = remote.filter((place) => !seen.has(fold(place.name)))
  return [...local, ...extra].slice(0, 8)
}