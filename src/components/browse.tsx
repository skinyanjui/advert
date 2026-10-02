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
import { cleanListing } from "@/lib/board-payload"
import { seedListings } from "@/lib/catalog"
import { isPubliclyVisibleListing } from "@/lib/listing-status"
import { useHomePlace } from "@/lib/home-place"
import { resolvePlace } from "@/lib/cities"
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
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState("")
  const [retry, setRetry] = useState(0)

  const filterKey = JSON.stringify({
    q: query.q,
    country: query.country,
    city: query.city,
    category: query.category,
    type: query.type,
  })

  useEffect(() => {
    const controller = new AbortController()
    const params = listingSearchParams(query)
    setLoading(true)
    setError("")
    void (async () => {
      try {
        const response = await fetch(`/api/listings?${params}`, { cache: "no-store", signal: controller.signal })
        const payload = (await response.json()) as { ok?: boolean; listings?: unknown[]; nextCursor?: string | null; reason?: string }
        if (!response.ok || !payload.ok) throw new Error(payload.reason ?? "Could not load listings.")
        const listings = (payload.listings ?? []).flatMap((item) => {
          const listing = cleanListing(item)
          return listing ? [listing] : []
        })
        setRemoteListings(listings)
        setNextCursor(typeof payload.nextCursor === "string" ? payload.nextCursor : null)
      } catch (cause) {
        if (controller.signal.aborted) return
        setRemoteListings([])
        setNextCursor(null)
        setError(cause instanceof Error ? cause.message : "Could not load listings.")
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    })()
    return () => controller.abort()
  }, [filterKey, retry])

  async function loadMore() {
    if (!nextCursor || loadingMore) return
    setLoadingMore(true)
    setError("")
    try {
      const params = listingSearchParams(query)
      params.set("cursor", nextCursor)
      const response = await fetch(`/api/listings?${params}`, { cache: "no-store" })
      const payload = (await response.json()) as { ok?: boolean; listings?: unknown[]; nextCursor?: string | null; reason?: string }
      if (!response.ok || !payload.ok) throw new Error(payload.reason ?? "Could not load more listings.")
      const incoming = (payload.listings ?? []).flatMap((item) => {
        const listing = cleanListing(item)
        return listing ? [listing] : []
      })
      setRemoteListings((current) => {
        const map = new Map(current.map((listing) => [listing.id, listing]))
        for (const listing of incoming) map.set(listing.id, listing)
        return [...map.values()]
      })
      setNextCursor(typeof payload.nextCursor === "string" ? payload.nextCursor : null)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load more listings.")
    } finally {
      setLoadingMore(false)
    }
  }

  const samples = useMemo(
    () => seedListings.filter((listing) =>
      (!query.country || listing.country === query.country) &&
      (!query.city || fold(listing.city) === fold(query.city)) &&
      (!query.category || listing.category === query.category) &&
      (!query.type || listing.subcategory === query.type) &&
      matchesQuery(listing, query.q),
    ),
    [query.country, query.city, query.category, query.type, query.q],
  )

  const loaded = useMemo(() => {
    const map = new Map<string, Listing>()
    for (const listing of remoteListings) map.set(listing.id, listing)
    for (const listing of samples) if (!map.has(listing.id)) map.set(listing.id, listing)
    return [...map.values()]
  }, [remoteListings, samples])

  const featuredNow = useFeaturedClock(loaded)
  const cityOptions = useMemo(() => query.country ? citiesIn(loaded) : [], [loaded, query.country])
  const visible = useMemo(() => {
    const preferred = getCountry(query.country ?? "")?.currencies[0]?.code ?? "USD"
    return sortListings(
      loaded.filter(isPubliclyVisibleListing),
      query.sort,
      preferred,
      query.q,
      homeOrigin(home, query.country),
      featuredNow,
    )
  }, [featuredNow, home, loaded, query.country, query.q, query.sort])

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

        {query.sort === "relevant" && visible.some((listing) => isFeatured(listing, featuredNow)) ? (
          <p className="mb-3 text-xs text-muted-foreground">{t("promotion.browseDisclosure")}</p>
        ) : null}

        {loading ? (
          <div role="status" className="rounded-xl border border-border px-4 py-10 text-center text-sm text-muted-foreground">
            Loading listings…
          </div>
        ) : error && visible.length === 0 ? (
          <div role="alert" className="rounded-xl border border-border px-4 py-10 text-center">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button type="button" variant="outline" className="mt-4 rounded-full" onClick={() => setRetry((value) => value + 1)}>
              Try again
            </Button>
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
                <ListingCard key={listing.id} listing={listing} preserve={preserve} />
              ))}
            </div>
            {error ? <p role="alert" className="mt-4 text-sm text-destructive">{error}</p> : null}
            {nextCursor ? (
              <div className="mt-6 flex justify-center">
                <Button type="button" variant="outline" className="rounded-full" disabled={loadingMore} onClick={() => void loadMore()}>
                  {loadingMore ? "Loading…" : "Load more"}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  )
}

function listingSearchParams(query: ReturnType<typeof useListingQuery>["query"]): URLSearchParams {
  const params = new URLSearchParams()
  if (query.q.trim()) params.set("q", query.q.trim())
  if (query.country) params.set("country", query.country)
  if (query.city) params.set("city", query.city)
  if (query.category) params.set("category", query.category)
  if (query.type) params.set("type", query.type)
  return params
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
