"use client"

import { Clock, Heart, MapPin } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import { formatPlace, formatPosted, formatPrice, hoursAgoOf } from "@/lib/format"
import { useMarketplace } from "@/lib/marketplace"
import type { Listing } from "@/lib/types"
import { cn } from "@/lib/utils"

export function ListingCard({
  listing,
  linked = true,
  saveable = true,
}: {
  listing: Listing
  linked?: boolean
  saveable?: boolean
}) {
  const { isSaved, toggleSaved } = useMarketplace()
  const saved = isSaved(listing.id)
  const posted = formatPosted(hoursAgoOf(listing))
  const body = (
    <>
      <div className="relative aspect-[4/3] overflow-hidden bg-neutral-100">
          <Image
            src={listing.image}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, 25vw"
            unoptimized={listing.image.startsWith("data:")}
            className="object-cover transition duration-300 group-hover:scale-[1.03]"
          />
          {listing.badge === "featured" ? (
            <span className="absolute top-3 left-3 rounded-full bg-neutral-950 px-2.5 py-1 text-[11px] font-medium text-white">
              Featured
            </span>
          ) : null}
          {listing.badge === "jobs" ? (
            <span className="absolute top-3 left-3 rounded-full bg-emerald-500 px-2.5 py-1 text-[11px] font-medium text-white">
              Jobs
            </span>
          ) : null}
        </div>
        <div className="flex flex-1 flex-col px-3.5 pt-3 pb-3.5">
          <p className="text-[15px] font-semibold tracking-tight text-neutral-950">
            {formatPrice(listing)}
          </p>
          <h3 className="mt-0.5 truncate text-sm text-neutral-800">{listing.title}</h3>
          {listing.meta ? (
            <p className="mt-0.5 text-xs text-neutral-500">{listing.meta}</p>
          ) : null}
          <div className="mt-2.5 flex items-center justify-between gap-2 text-xs text-neutral-500">
            <span className="flex min-w-0 items-center gap-1">
              <MapPin className="size-3.5 shrink-0" />
              <span className="truncate">{formatPlace(listing)}</span>
            </span>
            <span className="flex shrink-0 items-center gap-1">
              <Clock className="size-3.5 shrink-0" />
              <span>{posted}</span>
            </span>
          </div>
        </div>
    </>
  )

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-200/80 bg-white transition-shadow hover:shadow-md">
      {linked ? (
        <Link
          href={`/listings/${listing.id}`}
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
          className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-full bg-white/95 text-neutral-700 shadow-sm transition hover:scale-105"
        >
          <Heart className={cn("size-4", saved && "fill-rose-500 text-rose-500")} />
        </button>
      ) : null}
    </article>
  )
}
