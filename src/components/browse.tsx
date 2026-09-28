"use client"

import { ArrowUpDown } from "lucide-react"
import Link from "next/link"
import { useMemo } from "react"

import { BoardCitySearch, CityMap } from "@/components/board-place"
import { ListingCard } from "@/components/listing-card"
import { usePrefs } from "@/components/prefs-provider"
import { Button } from "@/components/ui/button"
import { listingGridClassName } from "@/lib/listing-grid"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { postAdHref } from "@/lib/active-place"
import { matchesQuery, sortListings } from "@/lib/board"
import { distanceKm, listingPoint } from "@/lib/distance"
import { isPubliclyVisibleListing } from "@/lib/listing-status"
import { useHomePlace } from "@/lib/home-place"
import { resolvePlace } from "@/lib/cities"
import type { MessageKey } from "@/lib/i18n"
import { useMarketplace } from "@/lib/marketplace"
import { countryName, fold, getCountry } from "@/lib/countries"
import {
  isCategoryId,
  isSortId,
  sorts,
  type CategoryId,
  type Listing,
  type SortId,
} from "@/lib/types"
import { boardSearch, useListingQuery } from "@/lib/use-listing-query"

function categoryMessageKey(id: CategoryId): MessageKey {
  return `category.${id}` as MessageKey
}

function sortNameKey(id: SortId): MessageKey {
  return `sort.${id}` as MessageKey
}

function sortHintKey(id: SortId): MessageKey {
  return `sort.${id}Hint` as MessageKey
}

export function Browse() {
  const { listings } = useMarketplace()
  const { query, update, clear } = useListingQuery()
  const home = useHomePlace()
  const { t } = usePrefs()

  const origin = useMemo(() => homeOrigin(home, query.country), [home, query.country])

  const inCountry = useMemo(
    () =>
      listings.filter(
        (listing) =>
          isPubliclyVisibleListing(listing) &&
          (!query.country || listing.country === query.country) &&
          matchesQuery(listing, query.q),
      ),
    [listings, query.country, query.q],
  )

  const cityOptions = useMemo(() => {
    if (!query.country) return []
    const pool = inCountry.filter((listing) => {
      if (query.category && listing.category !== query.category) return false
      if (query.type && listing.subcategory !== query.type) return false
      return true
    })
    return citiesIn(pool)
  }, [inCountry, query.category, query.country, query.type])

  const inCity = useMemo(() => {
    if (!query.city) return inCountry
    const needle = fold(query.city)
    return inCountry.filter((listing) => fold(listing.city) === needle)
  }, [inCountry, query.city])

  const visible = useMemo(() => {
    const inCategory = query.category
      ? inCity.filter((listing) => listing.category === query.category)
      : inCity
    const filtered = query.type ? inCategory.filter((listing) => listing.subcategory === query.type) : inCategory
    const preferred = getCountry(query.country ?? "")?.currencies[0]?.code ?? "USD"
    return sortListings(filtered, query.sort, preferred, query.q, origin)
  }, [inCity, origin, query.category, query.country, query.q, query.sort, query.type])

  const typeName =
    query.category && query.type
      ? t(`post.sub.${query.type}` as MessageKey)
      : query.category && isCategoryId(query.category)
        ? t(categoryMessageKey(query.category))
        : undefined

  const cityLabel = query.city
    ? (cityOptions.find((city) => fold(city.name) === fold(query.city ?? ""))?.name ?? query.city)
    : undefined
  const place = query.country
    ? cityLabel
      ? `${cityLabel}, ${countryName(query.country)}`
      : countryName(query.country)
    : t("nav.allAfrica")
  const preserve = boardSearch(query)
  const closestFirst =
    query.sort === "relevant" &&
    !query.q &&
    !!origin &&
    !!home &&
    (!query.country || query.country === home.country) &&
    (!home.city || !query.city || fold(query.city) !== fold(home.city))
  const countLabel =
    visible.length === 1
      ? t("browse.listingOne", { count: visible.length })
      : t("browse.listingMany", { count: visible.length })
  return (
    <div className="mx-auto w-full max-w-[1720px]">
      <section className="min-w-0 px-4 pt-0 pb-16 md:px-6">
        <div className="sticky top-16 z-40 -mx-4 mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-neutral-200/80 bg-background px-4 py-1 shadow-sm md:top-[72px] md:-mx-6 md:px-6">
          <p className="min-w-0 truncate text-sm text-neutral-500">
            <span className="font-medium text-neutral-900">{countLabel}</span>
            {typeName ? ` · ${typeName}` : ""} {t("browse.inPlace", { place })}
            {closestFirst ? ` · ${t("browse.nearbyFirst")}` : ""}
          </p>
          <Select
            value={query.sort}
            onValueChange={(value) => {
              if (isSortId(value)) update({ sort: value })
            }}
          >
            <SelectTrigger
              size="sm"
              className="h-7 gap-1.5 rounded-full border-neutral-200 bg-white px-2.5 font-medium text-neutral-800 shadow-none"
              aria-label={t("browse.sortListings")}
            >
              <ArrowUpDown className="size-3.5 text-neutral-400" aria-hidden="true" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end" className="z-[60] min-w-44">
              {sorts.map((sort) => (
                <SelectItem key={sort.id} value={sort.id} description={t(sortHintKey(sort.id))}>
                  {t(sortNameKey(sort.id))}
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
              places={cityOptions}
              onSelect={(city) => update({ city })}
            />
            {cityOptions.length > 0 ? (
              <div className="flex min-w-0 gap-1 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <CityPill active={!query.city} onClick={() => update({ city: null })}>
                  {t("browse.allCities")}
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
            category={query.category}
            type={query.type}
            typeName={typeName}
            onClearCity={() => update({ city: null })}
            onClearType={() => update({ type: null })}
            onClear={() => {
              clear()
            }}
          />
        ) : (
          <div className={listingGridClassName}>
            {visible.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                distanceKm={origin ? distanceKm(origin, listingPoint(listing)) : undefined}
                preserve={preserve}
              />
            ))}
          </div>
        )}
      </section>
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
  category,
  type,
  typeName,
  onClearCity,
  onClearType,
  onClear,
}: {
  country?: string
  city?: string
  category?: string
  type?: string
  typeName?: string
  onClearCity: () => void
  onClearType: () => void
  onClear: () => void
}) {
  const { t } = usePrefs()
  const place = city && country ? `${city}, ${countryName(country)}` : country ? countryName(country) : undefined
  const postHref = postAdHref(country ? { country, city } : null, { category, type })
  const title = typeName
    ? place
      ? t("browse.noResultsTypeInPlace", { type: typeName, place })
      : t("browse.noResultsType", { type: typeName })
    : place
      ? t("browse.noResultsInPlace", { place })
      : t("browse.noResults")

  return (
    <div className="rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-16 text-center">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-neutral-500">
        {city ? t("browse.emptyCityBody") : t("browse.emptySearchBody")}
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        {country || category ? (
          <Button asChild className="rounded-full">
            <Link href={postHref}>
              {city ? t("browse.postAdInCity", { city }) : t("browse.postAd")}
            </Link>
          </Button>
        ) : null}
        {type ? (
          <Button variant="outline" className="rounded-full" onClick={onClearType}>
            {t("browse.clearType")}
          </Button>
        ) : null}
        {city ? (
          <Button variant="outline" className="rounded-full" onClick={onClearCity}>
            {t("browse.clearCity")}
          </Button>
        ) : null}
        <Button variant={country ? "ghost" : "default"} className="rounded-full" onClick={onClear}>
          {t("browse.clearFilters")}
        </Button>
      </div>
    </div>
  )
}

function homeOrigin(
  home: { country: string; city?: string } | null,
  boardCountry?: string,
): { lat: number; lng: number } | null {
  if (!home) return null
  if (boardCountry && boardCountry !== home.country) return null
  if (home.city) {
    const place = resolvePlace(home.country, home.city)
    return { lat: place.lat, lng: place.lng }
  }
  const country = getCountry(home.country)
  if (!country) return null
  const capital = resolvePlace(home.country, country.capital)
  return { lat: capital.lat, lng: capital.lng }
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
