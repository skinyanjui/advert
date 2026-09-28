"use client"

import { Suspense } from "react"
import { usePathname } from "next/navigation"

import { Browse } from "@/components/browse"
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
    <div className="mx-auto w-full max-w-[1720px] px-4 py-6 md:px-6 md:py-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="aspect-[4/5] rounded-2xl bg-white" />
        ))}
      </div>
    </div>
  )
}
