import type { Metadata } from "next"
import { cache, Suspense } from "react"

import { ListingDetail } from "@/components/listing-detail"
import { getPublicListing } from "@/lib/board-store"
import { seedListings } from "@/lib/catalog"
import { listingMetadata } from "@/lib/search-discovery"
import type { Listing } from "@/lib/types"

const publicListing = cache(async (id: string): Promise<Listing | undefined> => {
  const sample = seedListings.find((item) => item.id === id)
  if (sample) return sample
  try {
    return await getPublicListing(id)
  } catch {
    return undefined
  }
})

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  return listingMetadata(await publicListing(id))
}

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const listing = await publicListing(id)
  return (
    <Suspense
      fallback={
        <div className="w-full px-3 py-6 md:px-4">
          <div className="h-4 w-28 rounded bg-neutral-200" />
          <div className="mt-4 aspect-[16/10] max-w-[1100px] rounded-2xl bg-neutral-200" />
        </div>
      }
    >
      <ListingDetail id={id} initialListing={listing} />
    </Suspense>
  )
}
