"use client"

import { useMemo } from "react"

import { isListingNeedingAttention } from "@/lib/expiry"
import { useMarketplace } from "@/lib/marketplace"
import { unreadMessageCount } from "@/lib/messages"
import type { NavItemId } from "@/lib/nav"

export type NavCounts = Partial<Record<NavItemId, number>>

/** Single source for nav badge counts (Messages unread, My ads needing attention). */
export function useNavCounts(): NavCounts {
  const { messages, listings } = useMarketplace()

  return useMemo(() => {
    const unread = unreadMessageCount(messages)
    const myAdsAttention = listings.filter(
      (listing) => listing.mine && isListingNeedingAttention(listing.expiresAt),
    ).length
    return {
      messages: unread,
      "my-ads": myAdsAttention,
    }
  }, [messages, listings])
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
