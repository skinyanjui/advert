"use client"

import { useMemo } from "react"

import { listingNeedsMyAdsAttention } from "@/lib/listing-status"
import { useMarketplace } from "@/lib/marketplace"
import { unreadMessageCount } from "@/lib/messages"
import type { NavItemId } from "@/lib/nav"

export type NavCounts = Partial<Record<NavItemId, number>>

/**
 * Single source for navigation activity counts.
 * Messages = unread incoming; My ads = active expiring soon or expired while active;
 * Saved = listings currently saved by this account/browser.
 * Board refresh on focus/visibility lives in MarketplaceProvider (soft refresh).
 */
export function useNavCounts(): NavCounts {
  const { messages, listings, savedIds } = useMarketplace()

  return useMemo(() => {
    const unread = unreadMessageCount(messages)
    const myAdsAttention = listings.filter(
      (listing) => listing.mine && listingNeedsMyAdsAttention(listing),
    ).length
    return {
      messages: unread,
      "my-ads": myAdsAttention,
      saved: savedIds.length,
    }
  }, [messages, listings, savedIds])
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
  if (id === "saved") return count === 1 ? `${base}, 1 saved listing` : `${base}, ${count} saved listings`
  return `${base}, ${count}`
}
