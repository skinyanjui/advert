"use client"

import type { ContactEventType } from "@/lib/contact-event-types"

export function trackListingContactEvent(listingId: string, eventType: ContactEventType): void {
  if (!listingId.startsWith("ad-")) return
  void fetch("/api/contact-events", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ listingId, eventType }),
    keepalive: true,
  }).catch(() => {
    // Analytics must never block marketplace contact actions.
  })
}
