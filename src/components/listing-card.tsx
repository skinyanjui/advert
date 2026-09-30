"use client"

import { Heart, MapPin } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { ListingPrice } from "@/components/listing-price"
import { useAuth } from "@/lib/auth"
import { signInHref } from "@/lib/auth-redirect"
import { countryCodeOf, formatDistance, formatPlace } from "@/lib/format"
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
  const auth = useAuth()
  const router = useRouter()
  const saved = isSaved(listing.id)
  const placeFull = formatPlace(listing)
  const countryCode = countryCodeOf(listing)
  const away = distanceKm === undefined ? undefined : formatDistance(distanceKm)
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
      </div>
      <div className="grid min-h-[4.75rem] grid-rows-[minmax(1.25rem,auto)_1rem_0.875rem_1.125rem] gap-y-0.5 px-2 pt-2 pb-2 xl:px-2">
        <p className="min-w-0 text-sm leading-5 font-semibold tracking-tight text-foreground">
          <ListingPrice listing={listing} />
        </p>
        <h3 className="truncate text-[13px] leading-4 text-foreground/85 xl:text-[12px]">{listing.title}</h3>
        <p
          className="flex min-w-0 items-center gap-1 text-[11px] leading-3.5 text-muted-foreground"
          title={placeFull}
          aria-label={placeFull}
        >
          <MapPin className="size-3 shrink-0" aria-hidden="true" />
          <span className="flex min-w-0 items-baseline">
            <span className="min-w-0 truncate">{listing.city}</span>
            <span className="shrink-0">, {countryCode}{away ? ` · ${away}` : ""}</span>
          </span>
        </p>
        <div className="flex items-center pr-9 text-[11px] leading-none text-muted-foreground">
          <PostedLabel listing={listing} />
        </div>
      </div>
    </>
  )

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-background transition-colors hover:border-foreground/20">
      <div className="flex h-full flex-col">{body}</div>
      {linked ? (
        <Link
          href={listingHref}
          aria-label={`View ${listing.title}`}
          className="absolute inset-0 z-10 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2"
        >
          <span className="sr-only">View listing</span>
        </Link>
      ) : null}
      {saveable ? (
        <button
          type="button"
          aria-pressed={saved}
          aria-label={saved ? `Remove ${listing.title} from saved` : `Save ${listing.title}`}
          onClick={() => {
            if (auth.configured && !auth.signedIn) {
              router.push(signInHref(listingHref))
              return
            }
            toggleSaved(listing.id)
          }}
          className="absolute top-2 right-2 z-20 flex size-7 items-center justify-center rounded-full bg-white/95 text-neutral-700 shadow-sm transition hover:scale-105"
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
