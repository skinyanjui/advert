"use client"

import { useEffect, useMemo } from "react"

import { isListingNeedingAttention } from "@/lib/expiry"
import { useMarketplace } from "@/lib/marketplace"
import { unreadMessageCount } from "@/lib/messages"
import type { NavItemId } from "@/lib/nav"

export type NavCounts = Partial<Record<NavItemId, number>>

/**
 * Single source for nav badge counts.
 * Messages = unread incoming; My ads = expired or expiring within 3 days.
 * Refreshes marketplace data on window focus / visibility so badges stay current.
 */
export function useNavCounts(): NavCounts {
  const { messages, listings, ready, reloadBoard } = useMarketplace()

  useEffect(() => {
    if (!ready) return

    function refresh() {
      void reloadBoard()
    }

    function onVisibility() {
      if (document.visibilityState === "visible") refresh()
    }

    window.addEventListener("focus", refresh)
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      window.removeEventListener("focus", refresh)
      document.removeEventListener("visibilitychange", onVisibility)
    }
  }, [ready, reloadBoard])

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
