"use client"

import { useEffect, useState } from "react"
import { isFeatured } from "@/lib/promotions"
import type { Listing } from "@/lib/types"

/** Re-render at the nearest end date, without waiting for a board refresh. */
export function useFeaturedClock(listings: readonly Listing[]) {
  const [now, setNow] = useState(() => Date.now())
  const deadlines = listings.map(item => item.featuredUntil ?? "").filter(Boolean).sort().join(",")
  useEffect(() => {
    const current = Date.now()
    const remaining = deadlines.split(",").map(Date.parse).filter(end => Number.isFinite(end) && end > now)
    if (!remaining.length) return
    const next = Math.min(...remaining)
    const timer = setTimeout(() => setNow(Date.now()), Math.max(0, Math.min(next - current + 1, 2147483647)))
    return () => clearTimeout(timer)
  }, [deadlines, now])
  return now
}

export function useFeatured(listing: Listing) {
  return isFeatured(listing, useFeaturedClock([listing]))
}
