import type { Metadata } from "next"
import { Suspense } from "react"

import { PostForm } from "@/components/post-form"

export const metadata: Metadata = {
  title: "Post an ad",
}

export default function PostPage() {
  return (
    <Suspense fallback={<p className="px-4 py-8 text-sm text-neutral-500">Loading the form…</p>}>
      <PostForm />
    </Suspense>
  )
}
