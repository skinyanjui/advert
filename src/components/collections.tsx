"use client"

import Link from "next/link"
import { useState } from "react"

import { ListingCard } from "@/components/listing-card"
import { postAdHref } from "@/lib/active-place"
import { useRememberedPlace } from "@/lib/use-remembered-place"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useMarketplace } from "@/lib/marketplace"

export function SavedPage() {
  const { ready, listings, savedIds } = useMarketplace()
  const saved = listings.filter((listing) => savedIds.includes(listing.id))

  if (!ready) return <PageSkeleton title="Saved ads" />

  return (
    <Collection
      title="Saved ads"
      description="Hearts you tap stay on this browser."
      emptyTitle="No saved ads yet"
      emptyBody="Tap the heart on a listing and it will wait for you here."
      listings={saved}
    />
  )
}

export function MyAdsPage() {
  const { ready, listings, removeListing } = useMarketplace()
  const mine = listings.filter((listing) => listing.mine)
  const postHref = postAdHref(useRememberedPlace())
  const [pendingId, setPendingId] = useState<string | null>(null)
  const pending = mine.find((listing) => listing.id === pendingId)

  if (!ready) return <PageSkeleton title="My ads" />

  return (
    <>
      <Collection
        title="My ads"
        description="Ads you publish from this browser. Anyone on the board can see them."
        emptyTitle="You have not posted an ad"
        emptyBody="Post something for sale, for rent, or a job. It appears at the top of the board."
        listings={mine}
        onRemove={setPendingId}
        actionHref={postHref}
        actionLabel="Post an ad"
      />
      <Dialog open={!!pending} onOpenChange={(open) => !open && setPendingId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove this ad?</DialogTitle>
            <DialogDescription>
              {pending ? `“${pending.title}” will leave the board.` : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingId(null)}>
              Keep it
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (pendingId) removeListing(pendingId)
                setPendingId(null)
              }}
            >
              Remove ad
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function Collection({
  title,
  description,
  emptyTitle,
  emptyBody,
  listings,
  onRemove,
  actionHref = "/",
  actionLabel = "Browse listings",
}: {
  title: string
  description: string
  emptyTitle: string
  emptyBody: string
  listings: { id: string }[]
  onRemove?: (id: string) => void
  actionHref?: string
  actionLabel?: string
}) {
  const { listings: all } = useMarketplace()
  const cards = listings
    .map((item) => all.find((listing) => listing.id === item.id))
    .filter((listing): listing is NonNullable<typeof listing> => !!listing)

  return (
    <div className="mx-auto w-full max-w-[1720px] px-4 py-8 md:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-neutral-500">{description}</p>
      {cards.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-neutral-300 bg-white px-6 py-16 text-center">
          <h2 className="text-lg font-semibold tracking-tight">{emptyTitle}</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-neutral-500">{emptyBody}</p>
          <Button asChild className="mt-5 rounded-full">
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {cards.map((listing) => (
            <div key={listing.id} className="flex flex-col gap-2">
              <ListingCard listing={listing} />
              {onRemove ? (
                <div className="flex items-center gap-1">
                  <Button variant="ghost" className="self-start" asChild>
                    <Link href={`/post?edit=${listing.id}`}>Edit</Link>
                  </Button>
                  <Button variant="ghost" className="self-start" onClick={() => onRemove(listing.id)}>
                    Remove ad
                  </Button>
                </div>
              ) : null}
            </div>
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
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="aspect-[4/5] rounded-2xl bg-neutral-200/70" />
        ))}
      </div>
    </div>
  )
}
