"use client"

import { ChevronDown, Menu, X } from "lucide-react"
import { Suspense, useEffect, useMemo, useRef } from "react"
import { usePathname, useSearchParams } from "next/navigation"

import { CategoryNav } from "@/components/category-nav"
import { SiteFooter } from "@/components/site-footer"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { useScrollFades } from "@/hooks/use-scroll-fades"
import { matchesQuery } from "@/lib/board"
import { canonicalCountry, fold } from "@/lib/countries"
import { useMarketplace } from "@/lib/marketplace"
import { categoryPlan } from "@/lib/posting"
import { categories, isSortId, type CategoryId, type Listing } from "@/lib/types"
import { categoryFromPath, type ListingQuery } from "@/lib/use-listing-query"
import { cn } from "@/lib/utils"

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

export function CategorySidebar() {
  const { isMobile, setOpenMobile } = useSidebar()
  const pathname = usePathname()

  // Close the mobile categories sheet after any route change (footer Sources, etc.).
  useEffect(() => {
    setOpenMobile(false)
  }, [pathname, setOpenMobile])

  return (
    <Sidebar
      side="left"
      collapsible={isMobile ? "offcanvas" : "none"}
      className={
        isMobile
          ? undefined
          : "sticky top-14 z-40 h-[calc(100svh-3.5rem)] border-r border-sidebar-border md:top-16 md:h-[calc(100svh-4rem)]"
      }
    >
      <CategorySidebarHeader />
      <CategorySidebarScroller />
      <SidebarFooter className="p-0">
        <CategorySidebarFooter />
      </SidebarFooter>
    </Sidebar>
  )
}

function CategorySidebarHeader() {
  const { isMobile, setOpenMobile } = useSidebar()
  if (!isMobile) return null

  return (
    <div className="flex shrink-0 items-center justify-between gap-2 border-b border-sidebar-border px-2 py-1.5">
      <p className="px-2 font-heading text-base font-medium text-sidebar-foreground">Categories</p>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-11 shrink-0 rounded-lg"
        aria-label="Close categories"
        onClick={() => setOpenMobile(false)}
      >
        <X className="size-5" />
      </Button>
    </div>
  )
}

function CategorySidebarFooter() {
  const { setOpenMobile } = useSidebar()
  return <SiteFooter onNavigate={() => setOpenMobile(false)} />
}

/** Scrollable category list with top/bottom fade cues and a More categories chip. */
function CategorySidebarScroller() {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const moreChipRef = useRef<HTMLButtonElement>(null)
  const hadMoreChip = useRef(false)
  const pathname = usePathname()
  const { ready, listings } = useMarketplace()
  const { top, bottom } = useScrollFades(scrollerRef)
  const { isMobile, openMobile } = useSidebar()
  const listingCount = listings.length

  useEffect(() => {
    if (isMobile && !openMobile) return
    const scroller = scrollerRef.current
    if (!scroller) return

    const scrollActiveIntoView = () => {
      const current = scroller.querySelector('[aria-current="page"]')
      if (!(current instanceof HTMLElement)) return
      current.scrollIntoView({
        block: "nearest",
        behavior: prefersReducedMotion() ? "auto" : "smooth",
      })
    }

    scrollActiveIntoView()
    const frame = requestAnimationFrame(() => {
      requestAnimationFrame(scrollActiveIntoView)
    })
    // After Suspense / DB board load settles, counts and active row may shift.
    const settle = window.setTimeout(scrollActiveIntoView, 120)
    const afterReady = ready ? window.setTimeout(scrollActiveIntoView, 280) : undefined
    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(settle)
      if (afterReady !== undefined) window.clearTimeout(afterReady)
    }
  }, [isMobile, openMobile, ready, listingCount, pathname])

  useEffect(() => {
    if (hadMoreChip.current && !bottom) {
      const chip = moreChipRef.current
      if (chip && document.activeElement === chip) {
        const current = scrollerRef.current?.querySelector('[aria-current="page"]')
        if (current instanceof HTMLElement) {
          current.focus({ preventScroll: true })
        } else {
          scrollerRef.current?.focus({ preventScroll: true })
        }
      }
    }
    hadMoreChip.current = bottom
  }, [bottom])

  function scrollMoreCategories() {
    const scroller = scrollerRef.current
    if (!scroller) return
    const step = Math.max(160, Math.round(scroller.clientHeight * 0.7))
    scroller.scrollBy({
      top: step,
      behavior: prefersReducedMotion() ? "auto" : "smooth",
    })
  }

  return (
    <SidebarContent className="relative overflow-hidden p-0">
      <div
        ref={scrollerRef}
        tabIndex={-1}
        className="h-full min-h-0 overflow-y-auto px-2 pt-3 pb-2 outline-none [&_[aria-current=page]]:scroll-mb-10 [&_[aria-current=page]]:scroll-mt-2"
      >
        <div>
          <Suspense fallback={<TopNavFallback />}>
            <CategoryTopNavLinks />
          </Suspense>
        </div>
      </div>
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 z-[1] h-6 bg-gradient-to-b from-sidebar to-transparent transition-opacity duration-200 motion-reduce:transition-none",
          top ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-6 bg-gradient-to-t from-sidebar to-transparent transition-opacity duration-200 motion-reduce:transition-none",
          bottom ? "opacity-100" : "opacity-0",
        )}
      />
      <button
        ref={moreChipRef}
        type="button"
        onClick={scrollMoreCategories}
        tabIndex={bottom ? 0 : -1}
        aria-hidden={!bottom}
        className={cn(
          "absolute bottom-2 left-1/2 z-[2] inline-flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-md border border-neutral-200 bg-sidebar/95 px-2.5 py-1 text-xs text-neutral-600 shadow-sm backdrop-blur-sm transition-opacity duration-200 hover:bg-neutral-50 hover:text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 motion-reduce:transition-none dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-50",
          bottom ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        More categories
        <ChevronDown className="size-3.5 shrink-0 opacity-70" aria-hidden />
      </button>
    </SidebarContent>
  )
}

/** Mobile-only: desktop shows the categories sidebar persistently. */
export function CategoryTopNav() {
  return (
    <SidebarTrigger
      aria-label="Browse categories"
      className="size-8 shrink-0 rounded-full border border-input bg-background md:hidden"
      size="icon-lg"
    >
      <Menu className="size-4" />
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
