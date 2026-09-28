import type { Metadata } from "next"
import { Suspense } from "react"

import { LoadingText } from "@/components/loading-text"
import { MessagesPage } from "@/components/messages-page"

export const metadata: Metadata = {
  title: "Messages",
}

export default function Page() {
  return (
    <Suspense fallback={<LoadingText messageKey="inbox.loading" className="px-4 py-8" />}>
      <MessagesPage />
    </Suspense>
  )
}
