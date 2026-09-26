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
  const pathCategory = categoryFromPath(pathname)
  const onBoard = pathname === "/" || pathCategory !== undefined

  const scrollAfterNav = useRef(false)

  const query = useMemo<ListingQuery>(() => {
    if (!onBoard) return { q: "", sort: "relevant" }
    const countryParam = searchParams.get("country")
    const sortParam = searchParams.get("sort")
    return {
      q: searchParams.get("q") ?? "",
      country: canonicalCountry(countryParam),
      city: searchParams.get("city")?.trim() || undefined,
      category: pathCategory,
      type: searchParams.get("type")?.trim() || undefined,
      sort: isSortId(sortParam) ? sortParam : "relevant",
    }
  }, [onBoard, pathCategory, searchParams])

  useEffect(() => {
    if (!onBoard) {
      scrollAfterNav.current = false
      return
    }
    const params = new URLSearchParams(searchParams.toString())
    const requested = params.get("category")
    if (requested) {
      params.delete("category")
      const destination = isCategoryId(requested) ? requested : pathCategory
      if (!isCategoryId(requested)) params.delete("type")
      normalizeBoardParams(params, destination)
      router.replace(boardHref(destination, params), { scroll: false })
      return
    }
    if (!params.get("country") && !isBrowsingEverywhere()) {
      const home = readHomePlace()
      const country = canonicalCountry(home?.country)
      if (country) {
        params.set("country", country)
        if (home?.city) params.set("city", home.city)
        normalizeBoardParams(params, pathCategory)
        router.replace(boardHref(pathCategory, params), { scroll: false })
        return
      }
    }
    if (normalizeBoardParams(params, pathCategory)) {
      router.replace(boardHref(pathCategory, params), { scroll: false })
      return
    }
    if (!scrollAfterNav.current) return
    scrollAfterNav.current = false
    window.scrollTo(0, 0)
  }, [onBoard, pathCategory, pathname, router, searchParams])

  const update = useCallback(
    (patch: QueryPatch) => {
      const params = new URLSearchParams(onBoard ? searchParams.toString() : "")
      let nextCategory = onBoard ? pathCategory : undefined

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
        nextCategory = patch.category ?? undefined
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

      params.delete("category")
      normalizeBoardParams(params, nextCategory)
      const href = boardHref(nextCategory, params)
      scrollAfterNav.current = (Object.keys(patch) as (keyof QueryPatch)[]).some((key) => key !== "q")
      if (onBoard) router.replace(href, { scroll: false })
      else router.push(href)
    },
    [onBoard, pathCategory, router, searchParams],
  )

  const clear = useCallback(() => {
    scrollAfterNav.current = true
    if (pathname === "/") router.replace("/", { scroll: false })
    else router.push("/")
  }, [pathname, router])

  return { query, update, clear }
}

export function boardSearch(query: ListingQuery): string {
  const params = new URLSearchParams()
  if (query.q) params.set("q", query.q)
  if (query.country) params.set("country", query.country)
  if (query.city) params.set("city", query.city)
  if (query.type) params.set("type", query.type)
  if (query.sort !== "relevant") params.set("sort", query.sort)
  return params.toString()
}

export function categoryFromPath(pathname: string): CategoryId | undefined {
  const [segment, extra] = pathname.split("/").filter(Boolean)
  if (!segment || extra) return undefined
  return isCategoryId(segment) ? segment : undefined
}

function boardHref(category: CategoryId | undefined, params: URLSearchParams): string {
  params.delete("category")
  const qs = params.toString()
  const path = category ? `/${category}` : "/"
  return qs ? `${path}?${qs}` : path
}

function normalizeBoardParams(params: URLSearchParams, category?: CategoryId): boolean {
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
  if (params.has("category")) {
    params.delete("category")
    changed = true
  }
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
