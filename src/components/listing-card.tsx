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
          className="object-cover"
        />
        {listing.badge === "featured" ? (
          <span className="absolute top-1.5 left-1.5 rounded-full bg-neutral-950 px-1.5 py-0.5 text-[9px] font-medium text-white sm:top-2 sm:left-2 sm:px-2 sm:text-[10px]">
            Featured
          </span>
        ) : null}
        {listing.sold ? (
          <span className="absolute top-1.5 left-1.5 rounded-full bg-neutral-800 px-1.5 py-0.5 text-[9px] font-medium text-white sm:top-2 sm:left-2 sm:px-2 sm:text-[10px]">
            Sold
          </span>
        ) : listing.hidden ? (
          <span className="absolute top-1.5 left-1.5 rounded-full bg-amber-700 px-1.5 py-0.5 text-[9px] font-medium text-white sm:top-2 sm:left-2 sm:px-2 sm:text-[10px]">
            Hidden
          </span>
        ) : isListingExpired(listing.expiresAt) ? (
          <span className="absolute top-1.5 left-1.5 rounded-full bg-neutral-600 px-1.5 py-0.5 text-[9px] font-medium text-white sm:top-2 sm:left-2 sm:px-2 sm:text-[10px]">
            Expired
          </span>
        ) : listing.sponsored ? (
          <span className="absolute top-1.5 left-1.5 rounded-full bg-sky-700 px-1.5 py-0.5 text-[9px] font-medium text-white sm:top-2 sm:left-2 sm:px-2 sm:text-[10px]">
            Sponsored
          </span>
        ) : listing.badge === "jobs" ? (
          <span className="absolute top-1.5 left-1.5 rounded-full bg-emerald-500 px-1.5 py-0.5 text-[9px] font-medium text-white sm:top-2 sm:left-2 sm:px-2 sm:text-[10px]">
            Jobs
          </span>
        ) : null}
      </div>
      <div className="px-2.5 py-2 sm:px-3 sm:py-2.5">
        <p className="min-w-0 truncate text-[13px] leading-4 font-semibold tracking-tight text-foreground sm:text-sm sm:leading-5">
          <ListingPrice listing={listing} />
        </p>
        <h3 className="mt-1 truncate text-xs leading-4 text-foreground/85 sm:text-[13px]">{listing.title}</h3>
        <p
          className="mt-1 flex min-w-0 items-center gap-1 text-[10px] leading-3.5 text-muted-foreground sm:mt-1.5 sm:text-[11px]"
          title={placeFull}
          aria-label={placeFull}
        >
          <MapPin className="size-3 shrink-0" aria-hidden="true" />
          <span className="flex min-w-0 items-baseline">
            <span className="min-w-0 truncate">{listing.city}</span>
            <span className="shrink-0">, {countryCode}{away ? ` · ${away}` : ""}</span>
          </span>
        </p>
        <div className="mt-1 flex items-center pr-7 text-[10px] leading-none text-muted-foreground sm:pr-9 sm:text-[11px]">
          <PostedLabel listing={listing} />
        </div>
      </div>
    </>
  )

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-lg border border-border/70 bg-card transition-colors hover:border-foreground/20 sm:rounded-xl">
      <div className="flex h-full flex-col">{body}</div>
      {linked ? (
        <Link
          href={listingHref}
          aria-label={`View ${listing.title}`}
          className="absolute inset-0 z-10 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 sm:rounded-xl"
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
          className="absolute top-1.5 right-1.5 z-20 flex size-8 items-center justify-center rounded-full bg-background/90 text-muted-foreground ring-1 ring-border/70 backdrop-blur transition-colors hover:text-foreground sm:top-2 sm:right-2 sm:size-7"
        >
          <Heart className={cn("size-4", saved && "fill-rose-500 text-rose-500")} />
        </button>
      ) : null}
    </article>
  )
}

function PostedLabel({ listing }: { listing: Listing }) {
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
