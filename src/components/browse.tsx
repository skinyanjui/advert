"use client"

import { SlidersHorizontal } from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"

import { BoardCitySearch, CityMap } from "@/components/board-place"
import { CategoryNav } from "@/components/category-nav"
import { ListingCard } from "@/components/listing-card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { hoursAgoOf } from "@/lib/format"
import { useMarketplace } from "@/lib/marketplace"
import {
  countryName,
  currencyLabel,
  fold,
  getCountry,
  languageLabel,
} from "@/lib/countries"
import {
  categories,
  categoryName,
  isSortId,
  sorts,
  type CategoryId,
  type Listing,
  type SortId,
} from "@/lib/types"
import { useClientTime } from "@/lib/use-client-time"
import { useListingQuery } from "@/lib/use-listing-query"

export function Browse() {
  const { listings } = useMarketplace()
  const { query, update, clear } = useListingQuery()
  const [sheetOpen, setSheetOpen] = useState(false)

  const inCountry = useMemo(
    () =>
      listings.filter(
        (listing) =>
          (!query.country || listing.country === query.country) &&
          matchesQuery(listing, query.q),
      ),
    [listings, query.country, query.q],
  )

  const inCategory = useMemo(
    () =>
      query.category
        ? inCountry.filter((listing) => listing.category === query.category)
        : inCountry,
    [inCountry, query.category],
  )

  const cityOptions = useMemo(
    () => (query.country ? citiesIn(inCategory) : []),
    [inCategory, query.country],
  )

  const inCity = useMemo(() => {
    if (!query.city) return inCountry
    const needle = fold(query.city)
    return inCountry.filter((listing) => fold(listing.city) === needle)
  }, [inCountry, query.city])

  const counts = useMemo(() => {
    const next = Object.fromEntries(categories.map((category) => [category.id, 0])) as Record<
      CategoryId,
      number
    >
    for (const listing of inCity) next[listing.category] += 1
    return next
  }, [inCity])

  const visible = useMemo(() => {
    const filtered = query.category
      ? inCity.filter((listing) => listing.category === query.category)
      : inCity
    const preferred = getCountry(query.country ?? "")?.currencies[0]?.code ?? "USD"
    return sortListings(filtered, query.sort, preferred)
  }, [inCity, query.category, query.country, query.sort])

  const cityLabel = query.city
    ? (cityOptions.find((city) => fold(city.name) === fold(query.city ?? ""))?.name ?? query.city)
    : undefined
  const place = query.country
    ? cityLabel
      ? `${cityLabel}, ${countryName(query.country)}`
      : countryName(query.country)
    : "All Africa"
  const categoryLabel = query.category ? categoryName(query.category) : "All listings"

  return (
    <div className="mx-auto flex w-full max-w-[1280px] gap-6 px-4 pt-4 pb-16 md:px-6">
      <aside className="hidden w-[228px] shrink-0 lg:block">
        <div className="sticky top-[132px]">
          <CategoryNav
            active={query.category}
            counts={counts}
            total={inCity.length}
            onSelect={(category) => update({ category: category ?? null })}
          />
        </div>
      </aside>
      <section className="min-w-0 flex-1">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="h-9 rounded-full lg:hidden">
                  <SlidersHorizontal />
                  {categoryLabel}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] sm:max-w-xs">
                <SheetHeader>
                  <SheetTitle>Categories</SheetTitle>
                </SheetHeader>
                <div className="px-4 pb-6">
                  <CategoryNav
                    active={query.category}
                    counts={counts}
                    total={inCity.length}
                    onSelect={(category) => {
                      update({ category: category ?? null })
                      setSheetOpen(false)
                    }}
                  />
                </div>
              </SheetContent>
            </Sheet>
            <div>
              <p className="text-sm text-neutral-500">
                <span className="font-medium text-neutral-900">{visible.length}</span>{" "}
                {visible.length === 1 ? "listing" : "listings"} in {place}
              </p>
              {query.country ? <CountryStrip code={query.country} /> : null}
            </div>
          </div>
          <Select
            value={query.sort}
            onValueChange={(value) => {
              if (isSortId(value)) update({ sort: value })
            }}
          >
            <SelectTrigger className="h-9 rounded-full" aria-label="Sort listings">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {sorts.map((sort) => (
                <SelectItem key={sort.id} value={sort.id}>
                  {sort.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {query.country ? (
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <BoardCitySearch
              country={query.country}
              city={cityLabel}
              onSelect={(city) => update({ city })}
            />
            {cityOptions.length > 0 ? (
              <div className="flex min-w-0 gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <CityPill active={!query.city} onClick={() => update({ city: null })}>
                  All cities
                </CityPill>
                {cityOptions.map((city) => (
                  <CityPill
                    key={city.name}
                    active={fold(query.city ?? "") === fold(city.name)}
                    onClick={() => update({ city: city.name })}
                  >
                    {city.name}
                    <span className="opacity-60">{city.count}</span>
                  </CityPill>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
        {query.country && query.city ? <CityMap country={query.country} city={query.city} /> : null}
        {visible.length === 0 ? (
          <EmptyResults
            country={query.country}
            city={cityLabel}
            onClearCity={() => update({ city: null })}
            onClear={() => {
              clear()
            }}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {visible.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function CountryStrip({ code }: { code: string }) {
  const country = getCountry(code)
  const localTime = useClientTime(country?.timezone ?? "Africa/Abidjan")
  if (!country) return null
  const currency = country.currencies[0]
  const languages = country.languages.map((language) => languageLabel(language.code, language.name))
  const shown = languages.slice(0, 3)
  const extra = languages.length - shown.length
  const languageText = extra > 0 ? `${shown.join(", ")} +${extra}` : shown.join(", ")
  const facts = [
    country.capital,
    localTime ?? country.timezone,
    country.timezone,
    currency ? `${currency.code} · ${currencyLabel(currency.code)}` : "",
    languageText,
    country.callingCode,
  ].filter(Boolean)

  return (
    <div className="mt-1.5 flex flex-wrap gap-1.5">
      {facts.map((fact) => (
        <span
          key={fact}
          className="inline-flex h-6 items-center rounded-full bg-white px-2 text-[11px] text-neutral-600 ring-1 ring-neutral-200"
        >
          {fact}
        </span>
      ))}
    </div>
  )
}

function CityPill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-neutral-950 px-3 text-xs font-medium text-white"
          : "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-white px-3 text-xs text-neutral-600 ring-1 ring-neutral-200 hover:text-neutral-950"
      }
    >
      {children}
    </button>
  )
}

function EmptyResults({
  country,
  city,
  onClearCity,
  onClear,
}: {
  country?: string
  city?: string
  onClearCity: () => void
  onClear: () => void
}) {
  const place = city && country ? `${city}, ${countryName(country)}` : country ? countryName(country) : undefined
  const postParams = new URLSearchParams()
  if (country) postParams.set("country", country)
  if (city) postParams.set("city", city)
  const postHref = postParams.size > 0 ? `/post?${postParams}` : "/post"

  return (
    <div className="rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-16 text-center">
      <h2 className="text-lg font-semibold tracking-tight">
        {place ? `No listings in ${place}` : "No listings match"}
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-neutral-500">
        {city
          ? "Nothing is listed in this city yet. Post an ad, or look through the other cities."
          : "Nothing in this country and category fits that search. Clear the filters or try a broader word like “toyota” or “rent”."}
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        {country ? (
          <Button asChild className="rounded-full">
            <Link href={postHref}>{city ? `Post an ad in ${city}` : "Post an ad"}</Link>
          </Button>
        ) : null}
        {city ? (
          <Button variant="outline" className="rounded-full" onClick={onClearCity}>
            All cities
          </Button>
        ) : null}
        <Button variant={country ? "ghost" : "default"} className="rounded-full" onClick={onClear}>
          Clear filters
        </Button>
      </div>
    </div>
  )
}

function matchesQuery(listing: Listing, q: string): boolean {
  const needle = q.trim().toLowerCase()
  if (!needle) return true
  const haystack = [
    listing.title,
    listing.city,
    listing.description,
    listing.meta ?? "",
    countryName(listing.country),
    categoryName(listing.category),
  ]
    .join(" ")
    .toLowerCase()
  return needle.split(/\s+/).every((word) => haystack.includes(word))
}

function citiesIn(listings: Listing[]): { name: string; count: number }[] {
  const map = new Map<string, { name: string; count: number }>()
  for (const listing of listings) {
    const key = fold(listing.city)
    const existing = map.get(key)
    if (existing) existing.count += 1
    else map.set(key, { name: listing.city, count: 1 })
  }
  return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

function sortListings(listings: Listing[], sort: SortId, preferredCurrency: string): Listing[] {
  const copy = [...listings]
  switch (sort) {
    case "relevant":
      return copy
    case "newest":
      copy.sort((a, b) => hoursAgoOf(a) - hoursAgoOf(b))
      return copy
    case "price-asc":
      copy.sort((a, b) => comparePrice(a, b, preferredCurrency, "asc"))
      return copy
    case "price-desc":
      copy.sort((a, b) => comparePrice(a, b, preferredCurrency, "desc"))
      return copy
    default: {
      const exhaustive: never = sort
      return exhaustive
    }
  }
}

function comparePrice(
  a: Listing,
  b: Listing,
  preferredCurrency: string,
  direction: "asc" | "desc",
): number {
  const group = currencyGroup(a, preferredCurrency) - currencyGroup(b, preferredCurrency)
  if (group !== 0) return group
  const price = a.price - b.price
  return direction === "asc" ? price : -price
}

function currencyGroup(listing: Listing, preferredCurrency: string): number {
  const currency = listing.currency ?? "USD"
  if (currency === preferredCurrency) return 0
  if (currency === "USD") return 1
  return 2
}
