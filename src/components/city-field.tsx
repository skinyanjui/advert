"use client"

import { useEffect, useRef, useState } from "react"

import { Input } from "@/components/ui/input"
import { searchCities } from "@/lib/cities"
import { countryName, fold } from "@/lib/countries"

export type ChosenPlace = {
  name: string
  lat: number
  lng: number
  timezone: string
}

type Suggestion = ChosenPlace & {
  label: string
  source: "geonames" | "nominatim"
}

export function CityField({
  country,
  city,
  onCityChange,
  onPlace,
}: {
  country: string
  city: string
  onCityChange: (city: string) => void
  onPlace: (place: ChosenPlace | null) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [remote, setRemote] = useState<{ query: string; places: Suggestion[] }>({
    query: "",
    places: [],
  })

  const local: Suggestion[] = searchCities(country, city, 6).map((item) => ({
    name: item.name,
    label: `${item.name} · GeoNames`,
    lat: item.lat,
    lng: item.lng,
    timezone: item.tz,
    source: "geonames",
  }))

  const query = city.trim()
  const remotePlaces = remote.query === `${country}|${query}` ? remote.places : []
  const suggestions = mergeSuggestions(local, remotePlaces)

  useEffect(() => {
    const nextQuery = city.trim()
    if (nextQuery.length < 2) return
    const handle = window.setTimeout(() => {
      const params = new URLSearchParams({ q: nextQuery, country })
      const key = `${country}|${nextQuery}`
      fetch(`/api/places?${params}`)
        .then((response) => (response.ok ? response.json() : { places: [] }))
        .then((payload: { places?: ChosenPlace[] }) => {
          const places = payload.places ?? []
          setRemote({
            query: key,
            places: places.map((place) => ({
              ...place,
              label: `${place.name} · OpenStreetMap`,
              source: "nominatim" as const,
            })),
          })
        })
        .catch(() => setRemote({ query: key, places: [] }))
    }, 400)
    return () => window.clearTimeout(handle)
  }, [city, country])

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        value={city}
        onChange={(event) => {
          onCityChange(event.target.value)
          onPlace(null)
          setOpen(true)
        }}
        onClick={() => setOpen(true)}
        onFocus={() => setOpen(true)}
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
          const exact = suggestions.find((place) => fold(place.name) === fold(city))
          const next = exact ?? (suggestions.length === 1 ? suggestions[0] : undefined)
          if (!next) return
          onCityChange(next.name)
          onPlace(next)
          setOpen(false)
          inputRef.current?.blur()
        }}
        placeholder={`City in ${countryName(country)}`}
        className="h-10"
        aria-autocomplete="list"
        aria-expanded={open && suggestions.length > 0}
        role="combobox"
      />
      {open && suggestions.length > 0 ? (
        <ul className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-lg border bg-white p-1 shadow-md">
          {suggestions.map((place) => (
            <li key={`${place.source}-${place.name}-${place.lat}`}>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left text-sm hover:bg-neutral-100"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  onCityChange(place.name)
                  onPlace(place)
                  setOpen(false)
                  inputRef.current?.blur()
                }}
              >
                <span className="truncate">{place.name}</span>
                <span className="shrink-0 text-[11px] text-neutral-400">
                  {place.source === "geonames" ? "GeoNames" : "Map"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

function mergeSuggestions(local: Suggestion[], remote: Suggestion[]): Suggestion[] {
  const seen = new Set(local.map((place) => place.name.toLowerCase()))
  const extra = remote.filter((place) => !seen.has(place.name.toLowerCase()))
  return [...local, ...extra].slice(0, 8)
}
