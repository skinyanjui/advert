"use client"

import { Clock, Heart, MapPin } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import { formatDistance, formatPlace, formatPosted, formatPrice, hoursAgoOf } from "@/lib/format"
import { isListingExpired } from "@/lib/expiry"
import { listingMeta } from "@/lib/posting"
import { useMarketplace } from "@/lib/marketplace"
import type { Listing } from "@/lib/types"
import { cn } from "@/lib/utils"

export function ListingCard({
  listing,
  linked = true,
  saveable = true,
  distanceKm,
  preserve,
}: {
  listing: Listing
  linked?: boolean
  saveable?: boolean
  distanceKm?: number
  preserve?: string
}) {
  const { isSaved, toggleSaved } = useMarketplace()
  const saved = isSaved(listing.id)
  const posted = formatPosted(hoursAgoOf(listing))
  const away = distanceKm === undefined ? undefined : formatDistance(distanceKm)
  const body = (
    <>
      <div className="relative aspect-[5/4] overflow-hidden bg-neutral-100">
        <Image
          src={listing.image}
          alt=""
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 20vw"
          unoptimized={listing.image.startsWith("data:")}
          className="object-cover transition duration-300 group-hover:scale-[1.03]"
        />
        {listing.badge === "featured" ? (
          <span className="absolute top-2 left-2 rounded-full bg-neutral-950 px-2 py-0.5 text-[10px] font-medium text-white">
            Featured
          </span>
        ) : null}
        {listing.sold ? (
          <span className="absolute top-2 left-2 rounded-full bg-neutral-800 px-2 py-0.5 text-[10px] font-medium text-white">
            Sold
          </span>
        ) : listing.hidden ? (
          <span className="absolute top-2 left-2 rounded-full bg-amber-700 px-2 py-0.5 text-[10px] font-medium text-white">
            Hidden
          </span>
        ) : isListingExpired(listing.expiresAt) ? (
          <span className="absolute top-2 left-2 rounded-full bg-neutral-600 px-2 py-0.5 text-[10px] font-medium text-white">
            Expired
          </span>
        ) : listing.badge === "jobs" ? (
          <span className="absolute top-2 left-2 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-medium text-white">
            Jobs
          </span>
        ) : null}
        {away ? (
          <span className="absolute bottom-2 left-2 rounded-full bg-white/95 px-2 py-0.5 text-[10px] font-medium text-neutral-800">
            {away}
          </span>
        ) : null}
      </div>
      <div className="grid grid-rows-[1.25rem_1rem_0.875rem_1.125rem] gap-y-0.5 px-2.5 pt-2 pb-2">
        <p className="truncate text-sm leading-5 font-semibold tracking-tight text-neutral-950">
          {formatPrice(listing)}
        </p>
        <h3 className="truncate text-[13px] leading-4 text-neutral-800">{listing.title}</h3>
        <p className="truncate text-[11px] leading-3.5 text-neutral-500">{listingMeta(listing)}</p>
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-1.5 text-[11px] leading-none text-neutral-500">
          <span className="flex min-w-0 items-center gap-1">
            <MapPin className="size-3 shrink-0" />
            <span className="truncate">{formatPlace(listing)}</span>
          </span>
          <span className="flex items-center gap-1">
            <Clock className="size-3 shrink-0" />
            <span className="whitespace-nowrap">{posted}</span>
          </span>
        </div>
      </div>
    </>
  )

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-neutral-200/80 bg-white transition-shadow hover:shadow-md">
      {linked ? (
        <Link
          href={preserve ? `/listings/${listing.id}?${preserve}` : `/listings/${listing.id}`}
          className="flex h-full flex-col outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2"
        >
          {body}
        </Link>
      ) : (
        <div className="flex h-full flex-col">{body}</div>
      )}
      {saveable ? (
        <button
          type="button"
          aria-pressed={saved}
          aria-label={saved ? `Remove ${listing.title} from saved` : `Save ${listing.title}`}
          onClick={() => toggleSaved(listing.id)}
          className="absolute top-2 right-2 flex size-7 items-center justify-center rounded-full bg-white/95 text-neutral-700 shadow-sm transition hover:scale-105"
        >
          <Heart className={cn("size-4", saved && "fill-rose-500 text-rose-500")} />
        </button>
      ) : null}
    </article>
  )
}
