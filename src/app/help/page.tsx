import type { Metadata } from "next"
import { HelpPageContent } from "@/components/help-page"

export const metadata: Metadata = {
  title: "Help",
  description: "Help for posting, country and currency preferences, location, messages, account access, safety, and privacy.",
}

export default function HelpPage() {
  return <HelpPageContent />
}
