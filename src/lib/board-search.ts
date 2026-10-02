import "server-only"

import { boardDb } from "@/lib/board-db"
import { cleanListing } from "@/lib/board-payload"
import { profilesByUserIds, applySellerProfile } from "@/lib/profile-store"
import type { Listing } from "@/lib/types"
import type { BoardListingRow } from "@/lib/board-inventory"

export type BrowseSearch = {
  country?: string
  city?: string
  category?: string
  subcategory?: string
  q?: string
  cursor?: string
  limit?: number
}

type Cursor = { postedAt: string; id: string }

function decodeCursor(value?: string): Cursor | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Cursor
    return typeof parsed.postedAt === "string" && typeof parsed.id === "string" ? parsed : null
  } catch {
    return null
  }
}

function encodeCursor(row: BoardListingRow): string {
  return Buffer.from(JSON.stringify({ postedAt: row.posted_at, id: row.id }), "utf8").toString("base64url")
}

function cleanParam(value?: string, max = 80) {
  const cleaned = value?.trim().slice(0, max)
  return cleaned || undefined
}

export async function searchBoard(search: BrowseSearch): Promise<{ listings: Listing[]; nextCursor: string | null }> {
  const db = boardDb()
  const cursor = decodeCursor(search.cursor)
  const limit = Math.max(1, Math.min(50, search.limit ?? 25))
  const { data, error } = await db.rpc("search_board_listings", {
    p_country: cleanParam(search.country, 2) ?? null,
    p_city: cleanParam(search.city) ?? null,
    p_category: cleanParam(search.category, 40) ?? null,
    p_subcategory: cleanParam(search.subcategory, 80) ?? null,
    p_query: cleanParam(search.q, 120) ?? null,
    p_cursor_posted_at: cursor?.postedAt ?? null,
    p_cursor_id: cursor?.id ?? null,
    p_limit: limit + 1,
  })
  if (error) throw new Error(error.message)

  const rows = (data ?? []) as BoardListingRow[]
  const page = rows.slice(0, limit)
  const ownerIds = page.map((row) => row.owner_id)
  const profiles = await profilesByUserIds(ownerIds)
  const listings = page.flatMap((row) => {
    const listing = cleanListing(row.payload)
    if (!listing) return []
    return [{
      ...applySellerProfile(listing, profiles.get(row.owner_id)),
      phone: "",
    }]
  })
  const nextCursor = rows.length > limit && page.length > 0 ? encodeCursor(page[page.length - 1]!) : null
  return { listings, nextCursor }
}
