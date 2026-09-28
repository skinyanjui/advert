"use client"

import { Menu } from "lucide-react"
import { Suspense, useMemo } from "react"
import { usePathname, useSearchParams } from "next/navigation"

import { CategoryNav } from "@/components/category-nav"
import { SiteFooter } from "@/components/site-footer"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { matchesQuery } from "@/lib/board"
import { canonicalCountry, fold } from "@/lib/countries"
import { useMarketplace } from "@/lib/marketplace"
import { categoryPlan } from "@/lib/posting"
import { categories, isSortId, type CategoryId, type Listing } from "@/lib/types"
import { categoryFromPath, type ListingQuery } from "@/lib/use-listing-query"

export function CategorySidebar() {
  return (
    <Sidebar
      side="left"
      collapsible="offcanvas"
      className="top-16! bottom-auto! z-40 h-[calc(100svh-4rem)]! border-r border-sidebar-border md:top-[72px]! md:h-[calc(100svh-72px)]!"
    >
      <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
        <p className="text-sm font-semibold text-sidebar-foreground">Categories</p>
      </SidebarHeader>
      <SidebarContent className="px-3 py-3">
        <Suspense fallback={<TopNavFallback />}>
          <CategoryTopNavLinks />
        </Suspense>
      </SidebarContent>
      <SidebarFooter className="p-0">
        <CategorySidebarFooter />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

function CategorySidebarFooter() {
  const { isMobile, setOpenMobile } = useSidebar()
  return (
    <SiteFooter
      onNavigate={() => {
        if (isMobile) setOpenMobile(false)
      }}
    />
  )
}

/** Mobile-only: desktop shows the categories sidebar persistently. */
export function CategoryTopNav() {
  return (
    <SidebarTrigger
      aria-label="Browse categories"
      className="size-9 shrink-0 rounded-full md:hidden"
      size="icon-lg"
    >
      <Menu className="size-5" />
      <span className="sr-only">Browse categories</span>
    </SidebarTrigger>
  )
}

function CategoryTopNavLinks() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { isMobile, setOpenMobile } = useSidebar()
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
  const onNavigate = () => {
    if (isMobile) setOpenMobile(false)
  }

  return (
    <CategoryNav
      active={active}
      counts={counts}
      total={inCity.length}
      types={types}
      activeType={activeType}
      hrefForCategory={(category) => listingHref(category, undefined, query)}
      hrefForType={(type) => listingHref(active, type, query)}
      onNavigate={onNavigate}
    />
  )
}

function TopNavFallback() {
  const counts = Object.fromEntries(categories.map((category) => [category.id, 0])) as Record<
    CategoryId,
    number
  >
  return (
    <CategoryNav
      counts={counts}
      total={0}
      hrefForCategory={(category) => (category ? `/${category}` : "/")}
      hrefForType={() => "/"}
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
