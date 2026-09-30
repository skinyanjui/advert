import type { Metadata } from "next"

import { PrivacyRequestPage } from "@/components/privacy-request-page"

export const metadata: Metadata = {
  title: "Privacy request",
}

export default function Page() {
  return <PrivacyRequestPage />
}
