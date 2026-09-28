"use client"

import type { ReactNode } from "react"

import { EmptyPanel } from "@/components/empty-panel"
import { ListingCard } from "@/components/listing-card"
import { useMarketplace } from "@/lib/marketplace"

export function SavedPage() {
  const { ready, listings, savedIds } = useMarketplace()
  const saved = listings.filter((listing) => savedIds.includes(listing.id))

  if (!ready) return <PageSkeleton title="Saved ads" />

  return (
    <Collection
      title="Saved ads"
      description="Saved hearts stay with your account when you are signed in."
      emptyTitle="No saved ads yet"
      emptyBody="Tap the heart on a listing and it will wait for you here."
      listings={saved}
    />
  )
}

function Collection({
  title,
  description,
  emptyTitle,
  emptyBody,
  listings,
  actionHref = "/",
  actionLabel = "Browse listings",
  banner,
}: {
  title: string
  description: string
  emptyTitle: string
  emptyBody: string
  listings: { id: string }[]
  actionHref?: string
  actionLabel?: string
  banner?: ReactNode
}) {
  const { listings: all } = useMarketplace()
  const cards = listings
    .map((item) => all.find((listing) => listing.id === item.id))
    .filter((listing): listing is NonNullable<typeof listing> => !!listing)

  return (
    <div className="mx-auto w-full max-w-[1720px] px-4 py-8 md:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-neutral-500">{description}</p>
      {banner}
      {cards.length === 0 ? (
        <EmptyPanel title={emptyTitle} body={emptyBody} actionHref={actionHref} actionLabel={actionLabel} />
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {cards.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  )
}

function PageSkeleton({ title }: { title: string }) {
  return (
    <div className="mx-auto w-full max-w-[1720px] px-4 py-8 md:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <div className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4 2xl:grid-cols-5">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="aspect-[4/5] rounded-2xl bg-neutral-200/70" />
        ))}
      </div>
    </div>
  )
}
