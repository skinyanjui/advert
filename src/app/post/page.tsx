import type { Metadata } from "next"

import { PostForm } from "@/components/post-form"

export const metadata: Metadata = {
  title: "Post an ad",
}

export default function PostPage() {
  return <PostForm />
}
