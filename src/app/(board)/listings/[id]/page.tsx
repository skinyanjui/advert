import type { Metadata } from "next"
import { Suspense } from "react"

import { ListingDetail } from "@/components/listing-detail"
import { boardDb } from "@/lib/board-db"
import { cleanListing } from "@/lib/board-payload"
import { seedListings } from "@/lib/catalog"
import { isListingExpired } from "@/lib/expiry"
import type { Listing } from "@/lib/types"

async function publicListing(id: string): Promise<Listing | undefined> {
  const sample = seedListings.find((item) => item.id === id)
  if (sample) return sample
  if (!/^ad-[a-zA-Z0-9-]{1,64}$/.test(id)) return undefined

  try {
    const { data, error } = await boardDb()
      .from("board_listings")
      .select("payload,hidden_at,expires_at")
      .eq("id", id)
      .maybeSingle()
    if (error || !data || data.hidden_at || isListingExpired(data.expires_at ?? undefined)) return undefined
    return cleanListing(data.payload)
  } catch {
    return undefined
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  const listing = await publicListing(id)
  if (!listing) return { title: "Listing unavailable", robots: { index: false, follow: false } }

  const isSample = seedListings.some((item) => item.id === id)
  const description = `${isSample ? "Sample ad. Contact unavailable. " : ""}${listing.description.replace(/\s+/g, " ").trim()}`.slice(0, 160)
  const image = listing.image.startsWith("/") || /^https:\/\//i.test(listing.image) ? listing.image : undefined
  return {
    title: listing.title,
    description,
    alternates: { canonical: `/listings/${encodeURIComponent(id)}` },
    openGraph: { title: listing.title, description, type: "article", images: image ? [{ url: image, alt: listing.title }] : [] },
    twitter: { card: image ? "summary_large_image" : "summary", title: listing.title, description, images: image ? [image] : [] },
  }
}

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-[1720px] px-4 py-8 md:px-6">
          <div className="h-4 w-28 rounded bg-neutral-200" />
          <div className="mt-4 aspect-[16/10] max-w-[1100px] rounded-2xl bg-neutral-200" />
        </div>
      }
    >
      <ListingDetail id={id} />
    </Suspense>
  )
}
