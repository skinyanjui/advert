"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef } from "react"

import { canonicalCountry } from "@/lib/countries"
import {
  clearBrowsingEverywhere,
  isBrowsingEverywhere,
  markBrowsingEverywhere,
  readHomePlace,
} from "@/lib/home-place"
import { findSubcategory } from "@/lib/posting"
import {
  isCategoryId,
  isSortId,
  type CategoryId,
  type CountryId,
  type SortId,
} from "@/lib/types"

export type ListingQuery = {
  q: string
  country?: CountryId
  city?: string
  category?: CategoryId
  type?: string
  sort: SortId
}

type QueryPatch = {
  q?: string
  country?: CountryId | null
  city?: string | null
  category?: CategoryId | null
  type?: string | null
  sort?: SortId | null
}

export function useListingQuery() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const onBoard = pathname === "/"

  const scrollAfterNav = useRef(false)

  const query = useMemo<ListingQuery>(() => {
    if (!onBoard) return { q: "", sort: "relevant" }
    const countryParam = searchParams.get("country")
    const categoryParam = searchParams.get("category")
    const sortParam = searchParams.get("sort")
    return {
      q: searchParams.get("q") ?? "",
      country: canonicalCountry(countryParam),
      city: searchParams.get("city")?.trim() || undefined,
      category: isCategoryId(categoryParam) ? categoryParam : undefined,
      type: searchParams.get("type")?.trim() || undefined,
      sort: isSortId(sortParam) ? sortParam : "relevant",
    }
  }, [onBoard, searchParams])

  useEffect(() => {
    if (pathname !== "/") {
      scrollAfterNav.current = false
      return
    }
    const params = new URLSearchParams(searchParams.toString())
    if (!params.get("country") && !isBrowsingEverywhere()) {
      const home = readHomePlace()
      const country = canonicalCountry(home?.country)
      if (country) {
        params.set("country", country)
        if (home?.city) params.set("city", home.city)
        normalizeBoardParams(params)
        const qs = params.toString()
        router.replace(qs ? `/?${qs}` : "/", { scroll: false })
        return
      }
    }
    if (normalizeBoardParams(params)) {
      const qs = params.toString()
      router.replace(qs ? `/?${qs}` : "/", { scroll: false })
      return
    }
    if (!scrollAfterNav.current) return
    scrollAfterNav.current = false
    window.scrollTo(0, 0)
  }, [pathname, router, searchParams])

  const update = useCallback(
    (patch: QueryPatch) => {
      const params = new URLSearchParams(onBoard ? searchParams.toString() : "")
      normalizeBoardParams(params)

      if ("q" in patch) {
        const next = patch.q?.trim() ?? ""
        if (next) params.set("q", next)
        else params.delete("q")
      }
      if ("country" in patch) {
        if (patch.country) {
          params.set("country", patch.country)
          clearBrowsingEverywhere()
        } else {
          params.delete("country")
          markBrowsingEverywhere()
        }
        if (!("city" in patch)) params.delete("city")
      }
      if ("city" in patch) {
        const next = patch.city?.trim() ?? ""
        if (next) params.set("city", next)
        else params.delete("city")
      }
      if ("category" in patch) {
        if (patch.category) params.set("category", patch.category)
        else params.delete("category")
        if (!("type" in patch)) params.delete("type")
      }
      if ("type" in patch) {
        const next = patch.type?.trim() ?? ""
        if (next) params.set("type", next)
        else params.delete("type")
      }
      if ("sort" in patch) {
        if (patch.sort && patch.sort !== "relevant") params.set("sort", patch.sort)
        else params.delete("sort")
      }

      const qs = params.toString()
      const href = qs ? `/?${qs}` : "/"
      scrollAfterNav.current = (Object.keys(patch) as (keyof QueryPatch)[]).some((key) => key !== "q")
      if (onBoard) router.replace(href, { scroll: false })
      else router.push(href)
    },
    [onBoard, router, searchParams],
  )

  const clear = useCallback(() => {
    scrollAfterNav.current = true
    if (pathname === "/") router.replace("/", { scroll: false })
    else router.push("/")
  }, [pathname, router])

  return { query, update, clear }
}

function normalizeBoardParams(params: URLSearchParams): boolean {
  let changed = false
  const rawCountry = params.get("country")
  if (rawCountry) {
    const canonical = canonicalCountry(rawCountry)
    if (!canonical) {
      params.delete("country")
      params.delete("city")
      changed = true
    } else if (canonical !== rawCountry) {
      params.set("country", canonical)
      changed = true
    }
  }
  const rawCategory = params.get("category")
  if (rawCategory && !isCategoryId(rawCategory)) {
    params.delete("category")
    params.delete("type")
    changed = true
  }
  const categoryParam = params.get("category")
  const category = isCategoryId(categoryParam) ? categoryParam : undefined
  const rawType = params.get("type")?.trim() ?? ""
  if (rawType) {
    const valid = category ? findSubcategory(category, rawType) : undefined
    if (!valid) {
      params.delete("type")
      changed = true
    } else if (params.get("type") !== valid.id) {
      params.set("type", valid.id)
      changed = true
    }
  }
  const rawSort = params.get("sort")
  if (rawSort && !isSortId(rawSort)) {
    params.delete("sort")
    changed = true
  }
  return changed
}
