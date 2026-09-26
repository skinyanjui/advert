import type { Metadata } from "next"

import { SavedPage } from "@/components/collections"

export const metadata: Metadata = {
  title: "Saved ads",
}

export default function Page() {
  return <SavedPage />
}
