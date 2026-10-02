"use client"

import { usePrefs } from "@/components/prefs-provider"
import type { PriceDisplayMode } from "@/lib/price-display"
import type { Listing } from "@/lib/types"
import { cn } from "@/lib/utils"

/** One buyer-market price for browsing, or the exact posted price for authoring and conversations. */
export function ListingPrice({
  listing,
  className,
  mode = "market",
}: {
  listing: Pick<Listing, "price" | "priceSuffix" | "currency" | "country">
  className?: string
  mode?: PriceDisplayMode
}) {
  const { formatListingPrice, t } = usePrefs()
  const display = formatListingPrice(listing, mode)
  const title = display.conversionUnavailable
    ? t("price.conversionUnavailable")
    : display.approximate ? t("price.converted", { currency: display.currency }) : undefined

  return (
    <span className={cn("truncate", className)} title={title}>
      {display.approximate ? <span className="sr-only">{t("price.approximate")} </span> : null}
      {display.primary}
    </span>
  )
}
