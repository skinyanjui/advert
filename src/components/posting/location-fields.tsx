"use client"

import { Check, LocateFixed } from "lucide-react"
import { useRef, useState } from "react"

import { CityField, type ChosenPlace } from "@/components/city-field"
import { FormField } from "@/components/form-field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  countryName,
  fold,
  moreCountries,
  primaryCountries,
  type CountryRecord,
} from "@/lib/countries"
import { cn } from "@/lib/utils"

export function PostingLocationFields({
  country,
  city,
  locationDetail,
  cityError,
  locationDetailError,
  onCountryChange,
  onCityChange,
  onLocationDetailChange,
  onPlace,
  onCoordinates,
}: {
  country: string
  city: string
  locationDetail: string
  cityError?: string
  locationDetailError?: string
  onCountryChange: (code: string) => void
  onCityChange: (city: string) => void
  onLocationDetailChange: (value: string) => void
  onPlace: (place: ChosenPlace | null) => void
  onCoordinates: (lat: number, lng: number) => void
}) {
  const [locating, setLocating] = useState(false)

  function useCurrentLocation() {
    if (!navigator.geolocation) return
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        onCoordinates(position.coords.latitude, position.coords.longitude)
        setLocating(false)
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60_000 },
    )
  }

  return (
    <div className="grid gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField label="Country" required>
          <CountryField country={country} onChange={onCountryChange} />
        </FormField>
        <FormField label="City" required error={cityError}>
          {country ? (
            <CityField country={country} city={city} onCityChange={onCityChange} onPlace={onPlace} />
          ) : (
            <Input disabled placeholder="Choose a country first" aria-disabled="true" className="h-11 bg-background sm:h-10" />
          )}
        </FormField>
      </div>
      <FormField
        label="Specific location"
        required
        error={locationDetailError}
        hint="Neighborhood, landmark, pickup point, or address. This appears on the listing detail page, so avoid a private home address unless you want it public."
      >
        <div className="flex gap-2">
          <Input
            value={locationDetail}
            onChange={(event) => onLocationDetailChange(event.target.value)}
            placeholder="e.g. Ntinda, near Capital Shoppers"
            className="h-11 bg-background sm:h-10"
            maxLength={120}
          />
          <Button type="button" variant="outline" className="h-11 shrink-0 rounded-xl sm:h-10" onClick={useCurrentLocation} disabled={locating}>
            <LocateFixed className="size-4" />
            <span className="hidden sm:inline">{locating ? "Locating…" : "Use location"}</span>
          </Button>
        </div>
      </FormField>
    </div>
  )
}

function CountryField({ country, onChange }: { country: string; onChange: (code: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const needle = fold(query)
  const featured = filterCountries(primaryCountries(), needle)
  const rest = filterCountries(moreCountries(), needle)
  const matches = [...featured, ...rest]
  const display = country ? countryName(country) : ""

  function pick(code: string) {
    onChange(code)
    setQuery("")
    setOpen(false)
    inputRef.current?.blur()
  }

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        value={open ? query : display}
        role="combobox"
        aria-expanded={open}
        aria-controls="post-country-list"
        aria-autocomplete="list"
        placeholder="Choose country"
        className="h-11 bg-background sm:h-10"
        onClick={() => setOpen(true)}
        onFocus={() => { setQuery(""); setOpen(true) }}
        onChange={(event) => { setQuery(event.target.value); setOpen(true) }}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onKeyDown={(event) => {
          if (event.key === "Escape") { setOpen(false); return }
          if (event.key !== "Enter" || !open) return
          event.preventDefault()
          const exact = matches.find((item) => fold(item.name) === needle || item.code.toLowerCase() === query.trim().toLowerCase())
          const next = exact ?? (matches.length === 1 ? matches[0] : undefined)
          if (next) pick(next.code)
        }}
      />
      {open ? (
        <ul id="post-country-list" role="listbox" className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-md">
          {matches.length === 0 ? <li className="px-2 py-2 text-sm text-muted-foreground">No country matches</li> : (
            <>
              {featured.map((item) => <CountryOption key={item.code} item={item} selected={item.code === country} onPick={pick} />)}
              {featured.length > 0 && rest.length > 0 ? <li className="my-1 border-t border-border" /> : null}
              {rest.map((item) => <CountryOption key={item.code} item={item} selected={item.code === country} onPick={pick} />)}
            </>
          )}
        </ul>
      ) : null}
    </div>
  )
}

function CountryOption({ item, selected, onPick }: { item: CountryRecord; selected: boolean; onPick: (code: string) => void }) {
  return (
    <li role="option" aria-selected={selected}>
      <button type="button" className={cn("flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring sm:min-h-0", selected && "font-medium")} onMouseDown={(event) => event.preventDefault()} onClick={() => onPick(item.code)}>
        <span className="truncate">{item.name}</span>
        {selected ? <Check className="size-3.5 shrink-0" /> : null}
      </button>
    </li>
  )
}

function filterCountries(list: CountryRecord[], needle: string): CountryRecord[] {
  if (!needle) return list
  return list.filter((item) => fold(item.name).includes(needle) || item.code.toLowerCase() === needle)
}
