"use client"

import { SlidersHorizontal } from "lucide-react"
import { useMemo, useState } from "react"

import { CategoryNav } from "@/components/category-nav"
import { ListingCard } from "@/components/listing-card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { hoursAgoOf } from "@/lib/format"
import { useMarketplace } from "@/lib/marketplace"
import { countryName } from "@/lib/countries"
import {
  categories,
  categoryName,
  isSortId,
  sorts,
  type CategoryId,
  type Listing,
} from "@/lib/types"
import { useListingQuery } from "@/lib/use-listing-query"

export function Browse() {
  const { listings } = useMarketplace()
  const { query, update, clear } = useListingQuery()
  const [sheetOpen, setSheetOpen] = useState(false)

  const scoped = useMemo(
    () =>
      listings.filter(
        (listing) =>
          (!query.country || listing.country === query.country) &&
          matchesQuery(listing, query.q),
      ),
    [listings, query.country, query.q],
  )

  const counts = useMemo(() => {
    const next = Object.fromEntries(categories.map((category) => [category.id, 0])) as Record<
      CategoryId,
      number
    >
    for (const listing of scoped) next[listing.category] += 1
    return next
  }, [scoped])

  const visible = useMemo(() => {
    const filtered = query.category
      ? scoped.filter((listing) => listing.category === query.category)
      : scoped
    return sortListings(filtered, query.sort)
  }, [scoped, query.category, query.sort])

  const place = query.country ? countryName(query.country) : "All Africa"
  const categoryLabel = query.category ? categoryName(query.category) : "All listings"

  return (
    <div className="mx-auto flex w-full max-w-[1280px] gap-6 px-4 pt-4 pb-16 md:px-6">
      <aside className="hidden w-[228px] shrink-0 lg:block">
        <div className="sticky top-[132px]">
          <CategoryNav
            active={query.category}
            counts={counts}
            total={scoped.length}
            onSelect={(category) => update({ category: category ?? null })}
          />
        </div>
      </aside>
      <section className="min-w-0 flex-1">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" className="h-9 rounded-full lg:hidden">
                  <SlidersHorizontal />
                  {categoryLabel}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[300px] sm:max-w-xs">
                <SheetHeader>
                  <SheetTitle>Categories</SheetTitle>
                </SheetHeader>
                <div className="px-4 pb-6">
                  <CategoryNav
                    active={query.category}
                    counts={counts}
                    total={scoped.length}
                    onSelect={(category) => {
                      update({ category: category ?? null })
                      setSheetOpen(false)
                    }}
                  />
                </div>
              </SheetContent>
            </Sheet>
            <p className="text-sm text-neutral-500">
              <span className="font-medium text-neutral-900">{visible.length}</span>{" "}
              {visible.length === 1 ? "listing" : "listings"} in {place}
            </p>
          </div>
          <Select
            value={query.sort}
            onValueChange={(value) => {
              if (isSortId(value)) update({ sort: value })
            }}
          >
            <SelectTrigger className="h-9 rounded-full" aria-label="Sort listings">
              <SelectValue />
            </SelectTrigger>
            <SelectContent align="end">
              {sorts.map((sort) => (
                <SelectItem key={sort.id} value={sort.id}>
                  {sort.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {visible.length === 0 ? (
          <EmptyResults
            onClear={() => {
              clear()
            }}
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {visible.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function EmptyResults({ onClear }: { onClear: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-16 text-center">
      <h2 className="text-lg font-semibold tracking-tight">No listings match</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-neutral-500">
        Nothing in this country and category fits that search. Clear the filters or try a broader word like “toyota” or “rent”.
      </p>
      <Button onClick={onClear} className="mt-5 rounded-full">
        Clear filters
      </Button>
    </div>
  )
}

function matchesQuery(listing: Listing, q: string): boolean {
  const needle = q.trim().toLowerCase()
  if (!needle) return true
  const haystack = [
    listing.title,
    listing.city,
    listing.description,
    listing.meta ?? "",
    countryName(listing.country),
    categoryName(listing.category),
  ]
    .join(" ")
    .toLowerCase()
  return needle.split(/\s+/).every((word) => haystack.includes(word))
}

function sortListings(listings: Listing[], sort: string): Listing[] {
  const copy = [...listings]
  if (sort === "newest") {
    copy.sort((a, b) => hoursAgoOf(a) - hoursAgoOf(b))
  } else if (sort === "price-asc") {
    copy.sort((a, b) => a.price - b.price)
  } else if (sort === "price-desc") {
    copy.sort((a, b) => b.price - a.price)
  }
  return copy
}
