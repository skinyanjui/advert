import type { Metadata } from "next"

import { CreditsPageContent } from "@/components/credits-page-content"

export const metadata: Metadata = { title: "Sources" }

export default function CreditsPage() {
  return <CreditsPageContent />
}
