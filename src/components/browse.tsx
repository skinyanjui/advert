"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

import { usePrefs } from "@/components/prefs-provider"
import { BoardCitySearch } from "@/components/board-place"
import { ListingCard } from "@/components/listing-card"
import { Button } from "@/components/ui/button"
import { listingGridClassName } from "@/lib/listing-grid"
import { postAdHref } from "@/lib/active-place"
import { useFeaturedClock } from "@/hooks/use-featured"
import { isFeatured } from "@/lib/promotions"
import { matchesQuery, sortListings } from "@/lib/board"
import { isPubliclyVisibleListing } from "@/lib/listing-status"
import { useHomePlace } from "@/lib/home-place"
import { resolvePlace } from "@/lib/cities"
import { parseBoardState } from "@/lib/board-payload"
import { seedListings } from "@/lib/catalog"
import { countryName, fold, getCountry } from "@/lib/countries"
import { type Listing } from "@/lib/types"
import { findSubcategory } from "@/lib/posting"
import { boardSearch, useListingQuery } from "@/lib/use-listing-query"

export function Browse() {
  const { t } = usePrefs()
  const { query, update, clear } = useListingQuery()
  const home = useHomePlace()
  const [remoteListings, setRemoteListings] = useState<Listing[]>([])
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams()
    if (query.country) params.set("country", query.country)
    if (query.city) params.set("city", query.city)
    if (query.category) params.set("category", query.category)
    if (query.type) params.set("type", query.type)
    if (query.q) params.set("q", query.q)
    params.set("limit", "25")
    setLoading(true)
    setLoadError(false)
    void fetch(`/api/browse?${params}`, { cache: "no-store", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("browse")
        const payload = await response.json() as { listings?: unknown; nextCursor?: string | null }
        const parsed = parseBoardState({ posted: payload.listings, savedIds: [], messages: [] }).posted
        setRemoteListings(parsed)
        setNextCursor(typeof payload.nextCursor === "string" ? payload.nextCursor : null)
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return
        setRemoteListings([])
        setNextCursor(null)
        setLoadError(true)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [query.country, query.city, query.category, query.type, query.q])

  const listings = useMemo(() => {
    const samples = seedListings.filter(
      (listing) =>
        (!query.country || listing.country === query.country) &&
        (!query.city || fold(listing.city) === fold(query.city)) &&
        (!query.category || listing.category === query.category) &&
        (!query.type || listing.subcategory === query.type) &&
        matchesQuery(listing, query.q),
    )
    const ids = new Set(remoteListings.map((listing) => listing.id))
    return [...remoteListings, ...samples.filter((listing) => !ids.has(listing.id))]
  }, [remoteListings, query.category, query.city, query.country, query.q, query.type])

  const featuredNow = useFeaturedClock(listings)

  const inCountry = useMemo(
    () => listings.filter((listing) => isPubliclyVisibleListing(listing)),
    [listings],
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

  async function loadMore() {
    if (!nextCursor || loading) return
    const params = new URLSearchParams()
    if (query.country) params.set("country", query.country)
    if (query.city) params.set("city", query.city)
    if (query.category) params.set("category", query.category)
    if (query.type) params.set("type", query.type)
    if (query.q) params.set("q", query.q)
    params.set("limit", "25")
    params.set("cursor", nextCursor)
    setLoading(true)
    setLoadError(false)
    try {
      const response = await fetch(`/api/browse?${params}`, { cache: "no-store" })
      if (!response.ok) throw new Error("browse")
      const payload = await response.json() as { listings?: unknown; nextCursor?: string | null }
      const page = parseBoardState({ posted: payload.listings, savedIds: [], messages: [] }).posted
      setRemoteListings((current) => {
        const ids = new Set(current.map((listing) => listing.id))
        return [...current, ...page.filter((listing) => !ids.has(listing.id))]
      })
      setNextCursor(typeof payload.nextCursor === "string" ? payload.nextCursor : null)
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }

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
          <p className="mb-3 text-xs text-muted-foreground">{t("promotion.browseDisclosure")}</p>
        ) : null}
        {loading && remoteListings.length === 0 ? (
          <p role="status" className="py-12 text-center text-sm text-muted-foreground">Loading listings…</p>
        ) : loadError && visible.length === 0 ? (
          <div className="rounded-xl border border-border px-4 py-10 text-center">
            <p className="text-sm text-muted-foreground">Listings could not be loaded.</p>
            <Button type="button" variant="outline" className="mt-4 rounded-full" onClick={() => window.location.reload()}>Try again</Button>
          </div>
        ) : visible.length === 0 ? (
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
          <>
            <div className={listingGridClassName}>
              {visible.map((listing) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  preserve={preserve}
                />
              ))}
            </div>
            {nextCursor ? (
              <div className="mt-6 flex justify-center">
                <Button type="button" variant="outline" className="rounded-full" disabled={loading} onClick={() => void loadMore()}>
                  {loading ? "Loading…" : "Load more"}
                </Button>
              </div>
            ) : null}
            {loadError && visible.length > 0 ? <p role="alert" className="mt-4 text-center text-sm text-destructive">More listings could not be loaded. Try again.</p> : null}
          </>
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
