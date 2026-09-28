"use client"

import Link from "next/link"
import { useMemo } from "react"

import { BoardCitySearch, CityMap } from "@/components/board-place"
import { categoryIcons } from "@/components/category-nav"
import { ListingCard } from "@/components/listing-card"
import { Button } from "@/components/ui/button"
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
import { isListingExpired } from "@/lib/expiry"
import { useHomePlace } from "@/lib/home-place"
import { resolvePlace } from "@/lib/cities"
import { useMarketplace } from "@/lib/marketplace"
import { countryName, fold, getCountry } from "@/lib/countries"
import {
  categories,
  categoryName,
  isSortId,
  sorts,
  type CategoryId,
  type Listing,
} from "@/lib/types"
import { categoryPlan, findSubcategory } from "@/lib/posting"
import { boardSearch, useListingQuery } from "@/lib/use-listing-query"
import { useSiteHeaderOffset } from "@/lib/use-site-header-offset"
import { cn } from "@/lib/utils"

export function Browse() {
  const { listings } = useMarketplace()
  const { query, update, clear } = useListingQuery()
  const home = useHomePlace()
  useSiteHeaderOffset()

  const origin = useMemo(() => homeOrigin(home, query.country), [home, query.country])

  const inCountry = useMemo(
    () =>
      listings.filter(
        (listing) =>
          !listing.sold &&
          !listing.hidden &&
          !isListingExpired(listing.expiresAt) &&
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

  const counts = useMemo(() => {
    const next = Object.fromEntries(categories.map((category) => [category.id, 0])) as Record<
      CategoryId,
      number
    >
    for (const listing of inCity) next[listing.category] += 1
    return next
  }, [inCity])

  const types = useMemo(() => {
    if (!query.category) return []
    const pool = inCity.filter((listing) => listing.category === query.category)
    const plan = categoryPlan(query.category)
    if (!plan) return []
    return plan.subcategories.flatMap((subcategory) => {
      const count = pool.filter((listing) => listing.subcategory === subcategory.id).length
      return count > 0 ? [{ id: subcategory.id, name: subcategory.name, count }] : []
    })
  }, [inCity, query.category])

  const visible = useMemo(() => {
    const inCategory = query.category
      ? inCity.filter((listing) => listing.category === query.category)
      : inCity
    const filtered = query.type ? inCategory.filter((listing) => listing.subcategory === query.type) : inCategory
    const preferred = getCountry(query.country ?? "")?.currencies[0]?.code ?? "USD"
    return sortListings(filtered, query.sort, preferred, query.q, origin)
  }, [inCity, origin, query.category, query.country, query.q, query.sort, query.type])

  const typeName = query.category && query.type ? findSubcategory(query.category, query.type)?.name : undefined

  const cityLabel = query.city
    ? (cityOptions.find((city) => fold(city.name) === fold(query.city ?? ""))?.name ?? query.city)
    : undefined
  const place = query.country
    ? cityLabel
      ? `${cityLabel}, ${countryName(query.country)}`
      : countryName(query.country)
    : "All Africa"
  const preserve = boardSearch(query)
  const hrefForCategory = (category?: CategoryId) => listingHref(category, undefined, query)
  const hrefForType = (type?: string) => listingHref(query.category, type, query)
  const closestFirst =
    query.sort === "relevant" &&
    !query.q &&
    !!origin &&
    !!home &&
    (!query.country || query.country === home.country) &&
    (!home.city || !query.city || fold(query.city) !== fold(home.city))
  return (
    <div className="mx-auto w-full max-w-[1720px]">
      <section className="min-w-0 px-4 py-4 pb-16 md:px-6 md:py-5">
        {/* Sticky board chrome: mobile category chips + count/sort under the site header. */}
        <div
          className="sticky z-40 -mx-4 mb-4 border-b border-neutral-200/80 bg-background px-4 py-3 shadow-sm md:-mx-6 md:px-6"
          style={{ top: "var(--site-header-offset)" }}
        >
          <nav
            aria-label="Categories"
            className="mb-3 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden"
          >
            <CategoryChip href={hrefForCategory(undefined)} active={!query.category} icon="all" label="All" />
            {categories.map((category) => (
              <CategoryChip
                key={category.id}
                href={hrefForCategory(category.id)}
                active={query.category === category.id}
                icon={category.id}
                label={categoryName(category.id)}
                count={counts[category.id]}
              />
            ))}
          </nav>
          {query.category && types.length > 0 ? (
            <div className="mb-3 flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden">
              <TypeChip href={hrefForType(undefined)} active={!query.type}>
                All types
              </TypeChip>
              {types.map((type) => (
                <TypeChip key={type.id} href={hrefForType(type.id)} active={query.type === type.id}>
                  {type.name}
                  <span className="opacity-60">{type.count}</span>
                </TypeChip>
              ))}
            </div>
          ) : null}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="min-w-0 text-sm text-neutral-500">
              <span className="font-medium text-neutral-900">{visible.length}</span>{" "}
              {visible.length === 1 ? "listing" : "listings"}
              {typeName ? ` · ${typeName}` : ""} in {place}
              {closestFirst ? " · closest first" : ""}
            </p>
            <Select
              value={query.sort}
              onValueChange={(value) => {
                if (isSortId(value)) update({ sort: value })
              }}
            >
              <SelectTrigger className="h-9 shrink-0 rounded-full" aria-label="Sort listings">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end" className="z-[60]">
                {sorts.map((sort) => (
                  <SelectItem key={sort.id} value={sort.id}>
                    {sort.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-5">
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

function CategoryChip({
  href,
  active,
  icon,
  label,
  count,
}: {
  href: string
  active: boolean
  icon: CategoryId | "all"
  label: string
  count?: number
}) {
  const Icon = categoryIcons[icon]
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-medium whitespace-nowrap",
        active
          ? "bg-neutral-950 text-white"
          : "bg-white text-neutral-700 ring-1 ring-neutral-200 hover:text-neutral-950",
      )}
    >
      <Icon className="size-3.5 shrink-0" />
      <span>{label}</span>
      {typeof count === "number" && count > 0 ? <span className="opacity-60">{count}</span> : null}
    </Link>
  )
}

function TypeChip({
  href,
  active,
  children,
}: {
  href: string
  active: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs whitespace-nowrap",
        active
          ? "bg-neutral-950 font-medium text-white"
          : "bg-neutral-100 text-neutral-600 hover:text-neutral-950",
      )}
    >
      {children}
    </Link>
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
  const place = city && country ? `${city}, ${countryName(country)}` : country ? countryName(country) : undefined
  const postHref = postAdHref(country ? { country, city } : null, { category, type })

  return (
    <div className="rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-16 text-center">
      <h2 className="text-lg font-semibold tracking-tight">
        {typeName ? `No ${typeName.toLowerCase()} listings${place ? ` in ${place}` : ""}` : place ? `No listings in ${place}` : "No listings match"}
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-neutral-500">
        {city
          ? "Nothing is listed in this city yet. Post an ad, or look through the other cities."
          : "Nothing in this country and category fits that search. Clear the filters or try a broader word like “toyota” or “rent”."}
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        {country || category ? (
          <Button asChild className="rounded-full">
            <Link href={postHref}>{city ? `Post an ad in ${city}` : "Post an ad"}</Link>
          </Button>
        ) : null}
        {type ? (
          <Button variant="outline" className="rounded-full" onClick={onClearType}>
            All types
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

function listingHref(
  category: CategoryId | undefined,
  type: string | undefined,
  query: { q: string; country?: string; city?: string; sort: string },
): string {
  const params = new URLSearchParams()
  if (query.q) params.set("q", query.q)
  if (query.country) params.set("country", query.country)
  if (query.city) params.set("city", query.city)
  if (type) params.set("type", type)
  if (query.sort !== "relevant") params.set("sort", query.sort)
  const qs = params.toString()
  const path = category ? `/${category}` : "/"
  return qs ? `${path}?${qs}` : path
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
