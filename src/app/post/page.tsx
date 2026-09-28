import type { Metadata } from "next"
import { Suspense } from "react"

import { LoadingText } from "@/components/loading-text"
import { PostForm } from "@/components/post-form"

export const metadata: Metadata = {
  title: "Post an ad",
}

export default function PostPage() {
  return (
    <Suspense fallback={<LoadingText messageKey="post.loadingForm" className="px-4 py-8" />}>
      <PostForm />
    </Suspense>
  )
}
