"use client"

import { Heart } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { ListingPrice } from "@/components/listing-price"
import { useAuth } from "@/lib/auth"
import { signInHref } from "@/lib/auth-redirect"
import { countryCodeOf, formatPlace } from "@/lib/format"
import { isListingExpired } from "@/lib/expiry"
import { useMarketplace } from "@/lib/marketplace"
import type { PriceDisplayMode } from "@/lib/price-display"
import { formatPostedDate, formatRelativePosted, hoursAgoOf, postedDateTime } from "@/lib/relative-time"
import type { Listing } from "@/lib/types"
import { cn } from "@/lib/utils"

export function ListingCard({ listing, linked = true, saveable = true, preserve, priceMode = "market" }: { listing: Listing; linked?: boolean; saveable?: boolean; preserve?: string; priceMode?: PriceDisplayMode }) {
  const { isSaved, toggleSaved } = useMarketplace()
  const auth = useAuth()
  const router = useRouter()
  const saved = isSaved(listing.id)
  const placeFull = formatPlace(listing)
  const countryCode = countryCodeOf(listing)
  const listingHref = preserve ? `/listings/${listing.id}?${preserve}` : `/listings/${listing.id}`
  const status = listing.sold ? "Sold" : listing.hidden ? "Hidden" : isListingExpired(listing.expiresAt) ? "Expired" : listing.sponsored ? "Sponsored" : listing.badge === "featured" ? "Featured" : listing.badge === "jobs" ? "Jobs" : null

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-md border border-border/70 bg-card transition-colors hover:border-foreground/25">
      <div className="relative aspect-[5/4] overflow-hidden bg-muted">
        <Image src={listing.image} alt="" fill sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw" unoptimized={listing.image.startsWith("data:")} className="object-cover" />
        {status ? <span className="absolute top-2 left-2 rounded-sm bg-primary px-1.5 py-0.5 text-[9px] font-medium tracking-wide text-primary-foreground uppercase">{status}</span> : null}
      </div>
      <div className="px-2.5 py-2 sm:px-3 sm:py-2.5">
        <p className="truncate text-[13px] leading-4 font-semibold tracking-tight text-foreground sm:text-sm"><ListingPrice listing={listing} mode={priceMode} /></p>
        <h3 className="mt-0.5 truncate text-xs leading-4 text-foreground/80 sm:text-[13px]">{listing.title}</h3>
        <p className="mt-1 truncate text-[10px] leading-4 text-muted-foreground sm:mt-1.5 sm:text-[11px]" title={placeFull} aria-label={placeFull}>{listing.city}, {countryCode} · <PostedLabel listing={listing} /></p>
      </div>
      {linked ? <Link href={listingHref} aria-label={`View ${listing.title}`} className="absolute inset-0 z-10 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"><span className="sr-only">View listing</span></Link> : null}
      {saveable ? (
        <button type="button" aria-pressed={saved} aria-label={saved ? `Remove ${listing.title} from saved` : `Save ${listing.title}`} onClick={() => { if (auth.configured && !auth.signedIn) { router.push(signInHref(listingHref)); return } toggleSaved(listing.id) }} className="absolute top-1.5 right-1.5 z-20 flex size-8 items-center justify-center rounded-full bg-background/95 text-muted-foreground ring-1 ring-border/70 backdrop-blur-sm transition-colors after:absolute after:-inset-1.5 after:rounded-full after:content-[''] hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:top-2 sm:right-2 sm:size-7 sm:after:inset-0">
          <Heart className={cn("size-3.5", saved && "fill-foreground text-foreground")} />
        </button>
      ) : null}
    </article>
  )
}

function PostedLabel({ listing }: { listing: Listing }) {
  const hasPostedAt = Boolean(listing.postedAt)
  const hours = hasPostedAt ? hoursAgoOf(listing) : listing.hoursAgo
  return <time dateTime={postedDateTime(listing)} title={formatPostedDate(listing.postedAt)} suppressHydrationWarning={hasPostedAt}>{formatRelativePosted(hours)}</time>
}
