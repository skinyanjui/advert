"use client"

import { ArrowRight, Heart, MapPin } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import { ListingPrice } from "@/components/listing-price"
import { countryCodeOf, formatDistance, formatPlace, whatsappHref } from "@/lib/format"
import { isListingExpired } from "@/lib/expiry"
import { useMarketplace } from "@/lib/marketplace"
import {
  formatPostedDate,
  formatRelativePosted,
  hoursAgoOf,
  postedDateTime,
} from "@/lib/relative-time"
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
  const placeFull = formatPlace(listing)
  const countryCode = countryCodeOf(listing)
  const away = distanceKm === undefined ? undefined : formatDistance(distanceKm)
  const whatsappAvailable = linked && !listing.mine && !listing.sold && !listing.hidden && !isListingExpired(listing.expiresAt) && Boolean(listing.phone.trim())
  const listingHref = preserve ? `/listings/${listing.id}?${preserve}` : `/listings/${listing.id}`
  const body = (
    <>
      <div className="relative aspect-[5/4] overflow-hidden bg-neutral-100">
        <Image
          src={listing.image}
          alt=""
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
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
        ) : listing.sponsored ? (
          <span className="absolute top-2 left-2 rounded-full bg-sky-700 px-2 py-0.5 text-[10px] font-medium text-white">
            Sponsored
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
      <div className="grid min-h-[4.75rem] grid-rows-[minmax(1.25rem,auto)_1rem_0.875rem_1.125rem] gap-y-0.5 px-2 pt-2 pb-2 xl:px-2">
        <p className="min-w-0 text-sm leading-5 font-semibold tracking-tight text-neutral-950">
          <ListingPrice listing={listing} />
        </p>
        <h3 className="truncate text-[13px] leading-4 text-neutral-800 xl:text-[12px]">{listing.title}</h3>
        <p
          className="flex min-w-0 items-center gap-1 text-[11px] leading-3.5 text-neutral-600"
          title={placeFull}
          aria-label={placeFull}
        >
          <MapPin className="size-3 shrink-0" aria-hidden="true" />
          <span className="flex min-w-0 items-baseline">
            <span className="min-w-0 truncate">{listing.city}</span>
            <span className="shrink-0">, {countryCode}</span>
          </span>
        </p>
        <div className="flex items-center text-[11px] leading-none text-neutral-500">
          <PostedLabel listing={listing} />
        </div>
      </div>
    </>
  )

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-neutral-200/80 bg-white transition-shadow hover:shadow-md">
      {linked ? (
        <Link
          href={listingHref}
          className="flex h-full flex-col outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2"
        >
          {body}
        </Link>
      ) : (
        <div className="flex h-full flex-col">{body}</div>
      )}
      {linked ? (
        <div className="flex items-center gap-1.5 px-2 pb-2">
          <Link
            href={listingHref}
            className="inline-flex h-8 min-w-0 flex-1 items-center justify-center gap-1 rounded-lg border border-neutral-200 bg-white px-2 text-[11px] font-medium text-neutral-900 transition hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950"
          >
            View listing <ArrowRight className="size-3" aria-hidden="true" />
          </Link>
          {whatsappAvailable ? (
            <a
              href={whatsappHref(listing.phone, listing.title)}
              target="_blank"
              rel="noreferrer"
              aria-label={`Chat with seller about ${listing.title} on WhatsApp`}
              title="Chat on WhatsApp"
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-white text-[#25D366] transition hover:border-[#25D366]/40 hover:bg-[#25D366]/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950"
            >
              <WhatsAppIcon className="size-4" />
            </a>
          ) : null}
        </div>
      ) : null}
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

function PostedLabel({ listing }: { listing: Listing }) {
  // Prefer the stored hoursAgo for seed ads (no postedAt) so SSR/client match.
  // When postedAt exists, recompute from now and suppress hydration warning on <time>.
  const hasPostedAt = Boolean(listing.postedAt)
  const hours = hasPostedAt ? hoursAgoOf(listing) : listing.hoursAgo
  const label = formatRelativePosted(hours)
  const dateTime = postedDateTime(listing)
  const fullDate = formatPostedDate(listing.postedAt)
  return (
    <time
      className="truncate"
      dateTime={dateTime}
      title={fullDate}
      suppressHydrationWarning={hasPostedAt}
    >
      {label}
    </time>
  )
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12.04 2C6.58 2 2.15 6.37 2.15 11.75c0 1.92.52 3.78 1.51 5.42L2 22l4.99-1.6a10.1 10.1 0 0 0 5.05 1.34h.01c5.46 0 9.89-4.37 9.89-9.75S17.5 2 12.04 2zm5.76 13.84c-.24.67-1.4 1.24-1.93 1.32-.49.07-1.12.1-1.81-.11-.42-.13-.95-.27-1.64-.53-2.89-1.09-4.77-3.64-4.92-3.81-.14-.17-1.18-1.57-1.18-3 0-1.42.74-2.12 1-2.41.27-.29.58-.36.78-.36h.56c.18 0 .42-.07.66.5.24.58.82 2 .89 2.15.07.14.12.31.02.5-.1.2-.14.32-.28.5-.14.17-.3.38-.42.51-.14.14-.28.29-.12.56.17.28.74 1.22 1.59 1.98 1.1.97 2.02 1.27 2.3 1.41.29.14.45.12.62-.07.17-.2.71-.83.9-1.11.19-.29.38-.24.64-.14.27.1 1.7.8 1.99.95.29.14.49.22.56.34.07.12.07.7-.17 1.37z" />
    </svg>
  )
}
