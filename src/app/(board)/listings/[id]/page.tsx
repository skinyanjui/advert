import type { Metadata } from "next"
import { Suspense } from "react"

import { ListingDetail } from "@/components/listing-detail"

export const metadata: Metadata = {
  title: "Listing",
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
