import { Package } from "lucide-react"
import Image from "next/image"

import type { Listing } from "@/lib/types"
import { cn } from "@/lib/utils"

export function ListingThumb({ listing, className }: { listing?: Listing; className?: string }) {
  return (
    <span className={cn("relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-neutral-100 text-neutral-400", className)} aria-hidden="true">
      {listing?.image ? (
        <Image src={listing.image} alt="" fill sizes="64px" unoptimized={listing.image.startsWith("data:")} className="object-cover" />
      ) : <Package className="size-5" />}
    </span>
  )
}
