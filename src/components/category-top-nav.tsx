"use client"

import { Suspense, useMemo } from "react"
import { usePathname, useSearchParams } from "next/navigation"

import { CategoryNav } from "@/components/category-nav"
import { matchesQuery } from "@/lib/board"
import { canonicalCountry, fold } from "@/lib/countries"
import { useMarketplace } from "@/lib/marketplace"
import { categoryPlan } from "@/lib/posting"
import { categories, isSortId, type CategoryId, type Listing } from "@/lib/types"
import { categoryFromPath, type ListingQuery } from "@/lib/use-listing-query"

export function CategoryTopNav() {
  const pathname = usePathname()
  const active = pathname === "/" ? undefined : categoryFromPath(pathname)

  return (
    <div className="border-b border-neutral-200/80 bg-white">
      <div className="mx-auto max-w-[1720px]">
        <Suspense fallback={<TopNavFallback active={active} />}>
          <CategoryTopNavLinks />
        </Suspense>
      </div>
    </div>
  )
}

function CategoryTopNavLinks() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { listings } = useMarketplace()
  const query = useMemo(
    () => readBoardQuery(pathname, searchParams),
    [pathname, searchParams],
  )
  const opened = openedListing(pathname, listings)
  const active = query.category ?? opened?.category
  const activeType = query.category ? query.type : opened?.subcategory
  const inCity = useMemo(() => listingsInPlace(listings, query), [listings, query])
  const counts = useMemo(() => countCategories(inCity), [inCity])
  const types = useMemo(() => typeChoices(inCity, active), [inCity, active])

  return (
    <CategoryNav
      active={active}
      counts={counts}
      total={inCity.length}
      types={types}
      activeType={activeType}
      hrefForCategory={(category) => listingHref(category, undefined, query)}
      hrefForType={(type) => listingHref(active, type, query)}
    />
  )
}

function TopNavFallback({ active }: { active?: CategoryId }) {
  const counts = Object.fromEntries(categories.map((category) => [category.id, 0])) as Record<
    CategoryId,
    number
  >
  return (
    <CategoryNav
      active={active}
      counts={counts}
      total={0}
      hrefForCategory={(category) => (category ? `/${category}` : "/")}
      hrefForType={() => (active ? `/${active}` : "/")}
    />
  )
}

function readBoardQuery(pathname: string, searchParams: { get: (key: string) => string | null }): ListingQuery {
  const pathCategory = categoryFromPath(pathname)
  const onBoard = pathname === "/" || pathCategory !== undefined
  const sortParam = searchParams.get("sort")
  return {
    q: searchParams.get("q") ?? "",
    country: canonicalCountry(searchParams.get("country")),
    city: searchParams.get("city")?.trim() || undefined,
    category: pathCategory,
    type: onBoard ? searchParams.get("type")?.trim() || undefined : undefined,
    sort: isSortId(sortParam) ? sortParam : "relevant",
  }
}

function openedListing(pathname: string, listings: Listing[]): Listing | undefined {
  const match = pathname.match(/^\/listings\/([^/]+)$/)
  if (!match?.[1]) return undefined
  const id = decodeURIComponent(match[1])
  return listings.find((listing) => listing.id === id)
}

function listingHref(category: CategoryId | undefined, type: string | undefined, query: ListingQuery): string {
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

function listingsInPlace(listings: Listing[], query: ListingQuery) {
  const city = query.city ? fold(query.city) : ""
  return listings.filter((listing) => {
    if (query.country && listing.country !== query.country) return false
    if (city && fold(listing.city) !== city) return false
    return matchesQuery(listing, query.q)
  })
}

function countCategories(listings: Listing[]): Record<CategoryId, number> {
  const next = Object.fromEntries(categories.map((category) => [category.id, 0])) as Record<
    CategoryId,
    number
  >
  for (const listing of listings) next[listing.category] += 1
  return next
}

function typeChoices(listings: Listing[], category: CategoryId | undefined) {
  if (!category) return []
  const plan = categoryPlan(category)
  if (!plan) return []
  const pool = listings.filter((listing) => listing.category === category)
  return plan.subcategories.flatMap((subcategory) => {
    const count = pool.filter((listing) => listing.subcategory === subcategory.id).length
    return count > 0 ? [{ id: subcategory.id, name: subcategory.name, count }] : []
  })
}
