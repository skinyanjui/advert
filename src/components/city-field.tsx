"use client"

import { useEffect, useId, useRef, useState } from "react"

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
}

export function CityField({
  id,
  country,
  city,
  onCityChange,
  onPlace,
  ...a11y
}: {
  id?: string
  country: string
  city: string
  onCityChange: (city: string) => void
  onPlace: (place: ChosenPlace | null) => void
  "aria-describedby"?: string
  "aria-errormessage"?: string
  "aria-invalid"?: true
  "aria-required"?: true
}) {
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [remote, setRemote] = useState<{ key: string; places: Suggestion[] }>({ key: "", places: [] })
  const local: Suggestion[] = searchCities(country, city, 6).map((item) => ({
    name: item.name,
    label: `${item.name} · GeoNames`,
    lat: item.lat,
    lng: item.lng,
    timezone: item.tz,
  }))
  const key = `${country}|${city.trim()}`
  const suggestions = (remote.key === key ? remote.places : local).slice(0, 8)

  useEffect(() => {
    const query = city.trim()
    if (query.length < 2) return
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: query, country })
        const response = await fetch(`/api/reference/cities?${params}`, { signal: controller.signal })
        if (!response.ok) return
        const payload = (await response.json()) as { places?: ChosenPlace[] }
        setRemote({ key: `${country}|${query}`, places: (payload.places ?? []).map((place) => ({ ...place, label: place.name })) })
      } catch { /* Keep local suggestions if the database is unavailable. */ }
    }, 250)
    return () => { controller.abort(); window.clearTimeout(timer) }
  }, [city, country])

  return (
    <div className="relative">
      <Input
        id={id}
        {...a11y}
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
        className="h-11 sm:h-10"
        aria-autocomplete="list"
        aria-expanded={open && suggestions.length > 0}
        role="combobox"
        aria-controls={listId}
      />
      {open && suggestions.length > 0 ? (
        <ul id={listId} role="listbox" className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-lg border bg-white p-1 shadow-md">
          {suggestions.map((place) => (
            <li key={`${place.name}-${place.lat}`} role="option" aria-selected={fold(place.name) === fold(city)}>
              <button
                type="button"
                className="flex min-h-11 w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-left text-sm hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring sm:min-h-0 sm:py-1.5"
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
                  GeoNames
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
