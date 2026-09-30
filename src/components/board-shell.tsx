"use client"

import { Suspense } from "react"
import { usePathname } from "next/navigation"

import { Browse } from "@/components/browse"
import { listingGridClassName } from "@/lib/listing-grid"
import { categoryFromPath } from "@/lib/use-listing-query"

export function BoardShell() {
  const pathname = usePathname()
  const onBoard = pathname === "/" || categoryFromPath(pathname) !== undefined
  const onListing = /^\/listings\/[^/]+$/.test(pathname)
  if (!onBoard && !onListing) return null

  return (
    <>
      {onBoard ? (
        <Suspense fallback={<ListingsFallback />}>
          <Browse />
        </Suspense>
      ) : null}
    </>
  )
}

function ListingsFallback() {
  return (
    <div className="w-full px-3 py-4 md:px-4 md:py-5">
      <div className={listingGridClassName}>
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="aspect-[4/5] rounded-2xl bg-white" />
        ))}
      </div>
    </div>
  )
}
