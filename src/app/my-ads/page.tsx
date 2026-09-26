import type { Metadata } from "next"

import { MyAdsPage } from "@/components/collections"

export const metadata: Metadata = {
  title: "My ads",
}

export default function Page() {
  return <MyAdsPage />
}
