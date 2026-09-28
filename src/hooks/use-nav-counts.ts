"use client"

import { useMemo } from "react"

import { listingNeedsMyAdsAttention } from "@/lib/listing-status"
import { useMarketplace } from "@/lib/marketplace"
import { unreadMessageCount } from "@/lib/messages"
import type { NavItemId } from "@/lib/nav"

export type NavCounts = Partial<Record<NavItemId, number>>

/**
 * Single source for nav badge counts.
 * Messages = unread incoming; My ads = active expiring soon or expired while active.
 * Board refresh on focus/visibility lives in MarketplaceProvider (soft refresh).
 */
export function useNavCounts(): NavCounts {
  const { messages, listings } = useMarketplace()

  return useMemo(() => {
    const unread = unreadMessageCount(messages)
    const myAdsAttention = listings.filter(
      (listing) => listing.mine && listingNeedsMyAdsAttention(listing),
    ).length
    return {
      messages: unread,
      "my-ads": myAdsAttention,
    }
  }, [messages, listings])
}

/** Convenience alias for Messages unread only. */
export function useUnreadCount(): number {
  return useNavCounts().messages ?? 0
}

export function navCountAriaLabel(base: string, id: NavItemId, counts: NavCounts): string {
  const count = counts[id] ?? 0
  if (!count) return base
  if (id === "messages") return `${base}, ${count} unread`
  if (id === "my-ads") {
    return count === 1 ? `${base}, 1 needs attention` : `${base}, ${count} need attention`
  }
  return `${base}, ${count}`
}
