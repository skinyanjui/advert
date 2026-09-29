import type { Metadata } from "next"
import { Suspense } from "react"

import { MessagesPage } from "@/components/messages-page"

export const metadata: Metadata = {
  title: "Messenger",
}

export default function Page() {
  return (
    <Suspense fallback={<p className="px-4 py-8 text-sm text-neutral-500">Loading your messages…</p>}>
      <MessagesPage />
    </Suspense>
  )
}
