"use client"

import { usePrefs } from "@/components/prefs-provider"
import type { Listing } from "@/lib/types"
import { cn } from "@/lib/utils"

/** Show one price in the viewer's selected display currency. */
export function ListingPrice({
  listing,
  className,
}: {
  listing: Pick<Listing, "price" | "priceSuffix" | "currency">
  className?: string
}) {
  const { formatListingPrice } = usePrefs()
  const display = formatListingPrice(listing)

  return <span className={cn("truncate", className)}>{display.primary}</span>
}
