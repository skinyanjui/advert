"use client"

import { usePrefs } from "@/components/prefs-provider"
import type { Listing } from "@/lib/types"
import { cn } from "@/lib/utils"

/** Show one price in the explicit currency override, active market country, default country, or listing country. */
export function ListingPrice({
  listing,
  className,
}: {
  listing: Pick<Listing, "price" | "priceSuffix" | "currency" | "country">
  className?: string
}) {
  const { formatListingPrice } = usePrefs()
  const display = formatListingPrice(listing)

  return <span className={cn("truncate", className)}>{display.primary}</span>
}
