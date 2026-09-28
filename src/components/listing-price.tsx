"use client"

import { usePrefs } from "@/components/prefs-provider"
import type { Listing } from "@/lib/types"
import { cn } from "@/lib/utils"

/** Price line that respects the viewer currency preference (≈ converted + original). */
export function ListingPrice({
  listing,
  className,
  secondaryClassName,
}: {
  listing: Pick<Listing, "price" | "priceSuffix" | "currency">
  className?: string
  secondaryClassName?: string
}) {
  const { formatListingPrice } = usePrefs()
  const display = formatListingPrice(listing)

  if (!display.approximate || !display.secondary) {
    return <span className={cn("truncate", className)}>{display.primary}</span>
  }

  return (
    <span className={cn("flex min-w-0 flex-col", className)}>
      <span className="truncate leading-tight">{display.primary}</span>
      <span className={cn("truncate text-[10px] font-normal text-neutral-500 leading-tight", secondaryClassName)}>
        {display.secondary}
      </span>
    </span>
  )
}
