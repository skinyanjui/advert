"use client"

import Link from "next/link"
import { useMemo } from "react"

import { BoardCitySearch } from "@/components/board-place"
import { ListingCard } from "@/components/listing-card"
import { Button } from "@/components/ui/button"
import { listingGridClassName } from "@/lib/listing-grid"
import { postAdHref } from "@/lib/active-place"
import { useFeaturedClock } from "@/hooks/use-featured"
import { isFeatured, promotionDisclosure } from "@/lib/promotions"
import { matchesQuery, sortListings } from "@/lib/board"
import { isPubliclyVisibleListing } from "@/lib/listing-status"
import { useHomePlace } from "@/lib/home-place"
import { resolvePlace } from "@/lib/cities"
import { useMarketplace } from "@/lib/marketplace"
import { countryName, fold, getCountry } from "@/lib/countries"
import { type Listing } from "@/lib/types"
import { findSubcategory } from "@/lib/posting"
import { boardSearch, useListingQuery } from "@/lib/use-listing-query"

export function Browse() {
  const { listings } = useMarketplace()
  const featuredNow = useFeaturedClock(listings)
  const { query, update, clear } = useListingQuery()
  const home = useHomePlace()

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
    return sortListings(filtered, query.sort, preferred, query.q, homeOrigin(home, query.country), featuredNow)
  }, [home, inCity, query.category, query.country, query.q, query.sort, query.type, featuredNow])

  const typeName = query.category && query.type ? findSubcategory(query.category, query.type)?.name : undefined

  const cityLabel = query.city
    ? (cityOptions.find((city) => fold(city.name) === fold(query.city ?? ""))?.name ?? query.city)
    : undefined
  const preserve = boardSearch(query)
  return (
    <div className="w-full">
      <section className="min-w-0 px-2.5 pt-2.5 pb-24 sm:px-3 sm:pt-3 md:px-4 md:pb-16">
        {query.country ? (
          <div className="mb-2.5 max-w-sm sm:mb-3">
            <BoardCitySearch
              country={query.country}
              city={cityLabel}
              places={cityOptions}
              onSelect={(city) => update({ city })}
            />
          </div>
        ) : null}
        {query.sort === "relevant" && visible.some(listing => isFeatured(listing, featuredNow)) ? (
          <p className="mb-3 text-xs text-muted-foreground">Featured listings appear first among matching results. {promotionDisclosure} Complimentary placements are marked “Featured”. Price and newest sorts do not receive a boost.</p>
        ) : null}
        {visible.length === 0 ? (
          <EmptyResults
            country={query.country}
            city={cityLabel}
            category={query.category}
            type={query.type}
            typeName={typeName}
            onBroaden={() => {
              if (query.city) update({ city: null })
              else if (query.type) update({ type: null })
              else clear()
            }}
          />
        ) : (
          <div className={listingGridClassName}>
            {visible.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                preserve={preserve}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function EmptyResults({
  country,
  city,
  category,
  type,
  typeName,
  onBroaden,
}: {
  country?: string
  city?: string
  category?: string
  type?: string
  typeName?: string
  onBroaden: () => void
}) {
  const place = city && country ? `${city}, ${countryName(country)}` : country ? countryName(country) : undefined
  const postHref = postAdHref(country ? { country, city } : null, { category, type })

  return (
    <div className="rounded-xl border border-border bg-background px-4 py-10 text-center sm:px-6 sm:py-12">
      <h2 className="text-lg font-semibold tracking-tight">
        {typeName ? `No ${typeName.toLowerCase()} listings${place ? ` in ${place}` : ""}` : place ? `No listings in ${place}` : "No listings match"}
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
        {city
          ? "Nothing is listed in this city yet. Post an ad, or look through the other cities."
          : "Nothing in this country and category fits that search. Clear the filters or try a broader word like “toyota” or “rent”."}
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
        <Button variant="outline" className="rounded-full" onClick={onBroaden}>
          {city ? "Search all cities" : type ? "View all types" : "Clear filters"}
        </Button>
        {country || category ? (
          <Button asChild className="rounded-full">
            <Link href={postHref}>{city ? `Post an ad in ${city}` : "Post an ad"}</Link>
          </Button>
        ) : null}
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
