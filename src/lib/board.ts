import { distanceKm, listingPoint, type GeoPoint } from "@/lib/distance"
import { fold, countryName } from "@/lib/countries"
import { isPubliclyVisibleListing } from "@/lib/listing-status"
import { hoursAgoOf } from "@/lib/format"
import { listingSearchBits } from "@/lib/posting"
import type { Listing, SortId } from "@/lib/types"

const timeRates: Record<string, number> = {
  "/ hour": 2,
  "/ day": 3,
  "/ night": 4,
  "/ week": 5,
  "/ month": 6,
}

/** A one-off price, then a per-unit price, then a time rate. */
function chargeRank(suffix: string | undefined): number {
  if (!suffix) return 0
  return timeRates[suffix] ?? 1
}

function currencyGroup(listing: Listing, preferredCurrency: string): number {
  const currency = listing.currency ?? "USD"
  if (currency === preferredCurrency) return 0
  if (currency === "USD") return 1
  return 2
}

function wordsOf(query: string): string[] {
  return fold(query).split(/\s+/).filter(Boolean)
}

function searchParts(listing: Listing): { title: string; near: string; far: string } {
  const title = fold(listing.title)
  const near = fold(
    [listing.city, listing.condition, listing.sellerName, ...listingSearchBits(listing)].join(" "),
  )
  const far = fold([listing.description, countryName(listing.country)].join(" "))
  return { title, near, far }
}

export function matchesQuery(listing: Listing, query: string): boolean {
  const words = wordsOf(query)
  if (words.length === 0) return true
  const parts = searchParts(listing)
  const haystack = `${parts.title} ${parts.near} ${parts.far}`
  return words.every((word) => haystack.includes(word))
}

/** Title hits outrank the card facts, which outrank the description. */
export function relevanceScore(listing: Listing, query: string): number {
  const words = wordsOf(query)
  if (words.length === 0) return 0
  const parts = searchParts(listing)
  return words.reduce((score, word) => {
    if (parts.title.includes(word)) return score + 8
    if (parts.near.includes(word)) return score + 4
    if (parts.far.includes(word)) return score + 1
    return score
  }, 0)
}

export function sortListings(
  listings: Listing[],
  sort: SortId,
  preferredCurrency: string,
  query = "",
  origin?: GeoPoint | null,
): Listing[] {
  const copy = [...listings]
  switch (sort) {
    case "relevant":
      return sortByRelevance(copy, query, origin)
    case "newest":
      copy.sort((a, b) => hoursAgoOf(a) - hoursAgoOf(b))
      return copy
    case "price-asc":
      return sortByPrice(copy, preferredCurrency, "asc")
    case "price-desc":
      return sortByPrice(copy, preferredCurrency, "desc")
    default: {
      const exhaustive: never = sort
      return exhaustive
    }
  }
}

function sortByRelevance(listings: Listing[], query: string, origin?: GeoPoint | null): Listing[] {
  const words = query.trim()
  if (!words && !origin) return listings
  const ranked = listings.map((listing) => ({
    listing,
    relevance: words ? relevanceScore(listing, query) : 0,
    distance: origin ? distanceKm(origin, listingPoint(listing)) : 0,
    age: hoursAgoOf(listing),
  }))
  ranked.sort((a, b) => {
    if (words && a.relevance !== b.relevance) return b.relevance - a.relevance
    if (origin && a.distance !== b.distance) return a.distance - b.distance
    return a.age - b.age
  })
  return ranked.map((entry) => entry.listing)
}

function sortByPrice(listings: Listing[], preferredCurrency: string, direction: "asc" | "desc"): Listing[] {
  const singleCategory = new Set(listings.map((listing) => listing.category)).size <= 1
  const byCurrency = new Map<number, Listing[]>()
  for (const listing of listings) {
    const group = currencyGroup(listing, preferredCurrency)
    const bucket = byCurrency.get(group) ?? []
    bucket.push(listing)
    byCurrency.set(group, bucket)
  }
  return [...byCurrency.keys()]
    .sort((a, b) => a - b)
    .flatMap((group) => {
      const items = byCurrency.get(group) ?? []
      if (!singleCategory) {
        items.sort((a, b) => (direction === "asc" ? a.price - b.price : b.price - a.price))
        return items
      }
      return sortChargeBands(items, direction)
    })
}

/** Keep nightly rates with nightly rates, and sale prices with sale prices. */
function sortChargeBands(listings: Listing[], direction: "asc" | "desc"): Listing[] {
  const bands = new Map<number, Listing[]>()
  for (const listing of listings) {
    const rank = chargeRank(listing.priceSuffix)
    const bucket = bands.get(rank) ?? []
    bucket.push(listing)
    bands.set(rank, bucket)
  }
  const ordered = [...bands.entries()].map(([rank, items]) => {
    items.sort((a, b) => (direction === "asc" ? a.price - b.price : b.price - a.price))
    return { rank, items, edge: items[0]?.price ?? 0 }
  })
  ordered.sort((a, b) => (direction === "asc" ? a.edge - b.edge : b.edge - a.edge) || a.rank - b.rank)
  return ordered.flatMap((band) => band.items)
}

export function relatedListings(listings: Listing[], listing: Listing, limit = 4): Listing[] {
  return listings
    .filter(
      (item) =>
        isPubliclyVisibleListing(item) &&
        item.category === listing.category &&
        item.id !== listing.id,
    )
    .map((item) => ({
      item,
      score:
        (item.subcategory && item.subcategory === listing.subcategory ? 4 : 0) +
        (fold(item.city) === fold(listing.city) ? 2 : 0) +
        (item.country === listing.country ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score || hoursAgoOf(a.item) - hoursAgoOf(b.item))
    .slice(0, limit)
    .map((entry) => entry.item)
}
