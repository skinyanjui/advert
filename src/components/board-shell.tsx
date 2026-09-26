"use client"

import { Suspense } from "react"
import { usePathname } from "next/navigation"

import { Browse } from "@/components/browse"
import { CategorySidebar } from "@/components/category-sidebar"
import { categoryFromPath } from "@/lib/use-listing-query"

export function BoardShell() {
  const pathname = usePathname()
  if (pathname !== "/" && categoryFromPath(pathname) === undefined) return null

  return (
    <>
      <CategorySidebar />
      <Suspense fallback={<ListingsFallback />}>
        <Browse />
      </Suspense>
    </>
  )
}

function ListingsFallback() {
  return (
    <div className="mx-auto w-full max-w-[1720px] px-4 py-6 md:py-5 md:pr-6 md:pl-[calc(var(--sidebar-width)+1.5rem)]">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 8 }, (_, index) => (
          <div key={index} className="aspect-[4/5] rounded-2xl bg-white" />
        ))}
      </div>
    </div>
  )
}
