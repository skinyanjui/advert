"use client"

import { ChevronDown, Menu } from "lucide-react"
import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"

import { CategoryNav } from "@/components/category-nav"
import { SiteFooter } from "@/components/site-footer"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
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

export function CategoryTopNav() {
  const pathname = usePathname()
  const active = pathname === "/" ? undefined : categoryFromPath(pathname)
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button type="button" variant="ghost" size="icon-lg" className="shrink-0 rounded-full" aria-label="Browse categories">
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[min(22rem,calc(100vw-2rem))] gap-0 overflow-hidden p-0">
        <SheetHeader>
          <SheetTitle>Categories</SheetTitle>
        </SheetHeader>
        <CategoryDrawerScroller active={active} onNavigate={() => setOpen(false)} />
        <SiteFooter onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  )
}

/** Mounted with SheetContent so the scroller ref exists when fade listeners attach. */
function CategoryDrawerScroller({
  active,
  onNavigate,
}: {
  active?: CategoryId
  onNavigate: () => void
}) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const { top, bottom } = useScrollFades(scrollerRef)

  useEffect(() => {
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
    const settle = window.setTimeout(scrollActiveIntoView, 120)
    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(settle)
    }
  }, [])

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
    <div className="relative min-h-0 flex-1">
      <div ref={scrollerRef} className="h-full min-h-0 overflow-y-auto px-3 pb-4">
        <div>
          <Suspense fallback={<TopNavFallback active={active} onNavigate={onNavigate} />}>
            <CategoryTopNavLinks onNavigate={onNavigate} />
          </Suspense>
        </div>
      </div>
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 top-0 z-[1] h-6 bg-gradient-to-b from-popover to-transparent transition-opacity duration-200 motion-reduce:transition-none",
          top ? "opacity-100" : "opacity-0",
        )}
      />
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-6 bg-gradient-to-t from-popover to-transparent transition-opacity duration-200 motion-reduce:transition-none",
          bottom ? "opacity-100" : "opacity-0",
        )}
      />
      <button
        type="button"
        onClick={scrollMoreCategories}
        tabIndex={bottom ? 0 : -1}
        aria-hidden={!bottom}
        className={cn(
          "absolute bottom-2 left-1/2 z-[2] inline-flex -translate-x-1/2 items-center gap-1 rounded-md border border-neutral-200 bg-popover/95 px-2.5 py-1 text-xs text-neutral-600 shadow-sm backdrop-blur-sm transition-opacity duration-200 hover:bg-neutral-50 hover:text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-950 motion-reduce:transition-none dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800 dark:hover:text-neutral-50",
          bottom ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      >
        More categories
        <ChevronDown className="size-3.5 opacity-70" aria-hidden />
      </button>
    </div>
  )
}

function CategoryTopNavLinks({ onNavigate }: { onNavigate: () => void }) {
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
      onNavigate={onNavigate}
    />
  )
}

function TopNavFallback({ active, onNavigate }: { active?: CategoryId; onNavigate: () => void }) {
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
      onNavigate={onNavigate}
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
