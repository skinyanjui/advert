"use client"

import { Check } from "lucide-react"
import { useRef, useState } from "react"

import { CityField, type ChosenPlace } from "@/components/city-field"
import { FormField } from "@/components/form-field"
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
  cityError,
  onCountryChange,
  onCityChange,
  onPlace,
}: {
  country: string
  city: string
  cityError?: string
  onCountryChange: (code: string) => void
  onCityChange: (city: string) => void
  onPlace: (place: ChosenPlace | null) => void
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <FormField label="Country" required>
        <CountryField country={country} onChange={onCountryChange} />
      </FormField>
      <FormField label="City" required error={cityError}>
        {country ? (
          <CityField country={country} city={city} onCityChange={onCityChange} onPlace={onPlace} />
        ) : (
          <Input disabled placeholder="Choose a country first" aria-disabled="true" className="h-10 bg-background" />
        )}
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
        className="h-10 bg-background"
        onClick={() => setOpen(true)}
        onFocus={() => {
          setQuery("")
          setOpen(true)
        }}
        onChange={(event) => {
          setQuery(event.target.value)
          setOpen(true)
        }}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false)
            return
          }
          if (event.key !== "Enter" || !open) return
          event.preventDefault()
          const exact = matches.find(
            (item) => fold(item.name) === needle || item.code.toLowerCase() === query.trim().toLowerCase(),
          )
          const next = exact ?? (matches.length === 1 ? matches[0] : undefined)
          if (next) pick(next.code)
        }}
      />
      {open ? (
        <ul id="post-country-list" role="listbox" className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-md">
          {matches.length === 0 ? (
            <li className="px-2 py-2 text-sm text-muted-foreground">No country matches</li>
          ) : (
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
      <button
        type="button"
        className={cn("flex w-full items-center justify-between gap-3 rounded-lg px-2 py-2 text-left text-sm hover:bg-muted", selected && "font-medium")}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => onPick(item.code)}
      >
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
