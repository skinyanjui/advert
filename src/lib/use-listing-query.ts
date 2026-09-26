"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useMemo } from "react"

import {
  isCategoryId,
  isCountryId,
  isSortId,
  type CategoryId,
  type CountryId,
  type SortId,
} from "@/lib/types"

export type ListingQuery = {
  q: string
  country?: CountryId
  category?: CategoryId
  sort: SortId
}

type QueryPatch = {
  q?: string
  country?: CountryId | null
  category?: CategoryId | null
  sort?: SortId | null
}

export function useListingQuery() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const query = useMemo<ListingQuery>(() => {
    const countryParam = searchParams.get("country")
    const categoryParam = searchParams.get("category")
    const sortParam = searchParams.get("sort")
    return {
      q: searchParams.get("q") ?? "",
      country: isCountryId(countryParam) ? countryParam : undefined,
      category: isCategoryId(categoryParam) ? categoryParam : undefined,
      sort: isSortId(sortParam) ? sortParam : "relevant",
    }
  }, [searchParams])

  const update = useCallback(
    (patch: QueryPatch) => {
      const params = new URLSearchParams(searchParams.toString())

      if ("q" in patch) {
        const next = patch.q?.trim() ?? ""
        if (next) params.set("q", next)
        else params.delete("q")
      }
      if ("country" in patch) {
        if (patch.country) params.set("country", patch.country)
        else params.delete("country")
      }
      if ("category" in patch) {
        if (patch.category) params.set("category", patch.category)
        else params.delete("category")
      }
      if ("sort" in patch) {
        if (patch.sort && patch.sort !== "relevant") params.set("sort", patch.sort)
        else params.delete("sort")
      }

      const qs = params.toString()
      const href = qs ? `/?${qs}` : "/"
      if (pathname === "/") router.replace(href, { scroll: false })
      else router.push(href)
    },
    [pathname, router, searchParams],
  )

  const clear = useCallback(() => {
    if (pathname === "/") router.replace("/", { scroll: false })
    else router.push("/")
  }, [pathname, router])

  return { query, update, clear }
}
