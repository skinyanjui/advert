import type { Metadata } from "next"

import { MyAdsPage } from "@/components/my-ads-page"

export const metadata: Metadata = {
  title: "My ads",
}

export default function Page() {
  return <MyAdsPage />
}
