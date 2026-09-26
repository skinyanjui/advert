import { Suspense } from "react"

import { Browse } from "@/components/browse"

export default function HomePage() {
  return (
    <Suspense fallback={<BrowseFallback />}>
      <Browse />
    </Suspense>
  )
}

function BrowseFallback() {
  return (
    <div className="mx-auto grid w-full max-w-[1280px] gap-4 px-4 py-6 sm:grid-cols-2 md:px-6 xl:grid-cols-4">
      {Array.from({ length: 8 }, (_, index) => (
        <div key={index} className="aspect-[4/5] rounded-2xl bg-white" />
      ))}
    </div>
  )
}
