import type { SupabaseClient } from "@supabase/supabase-js"
import { inventoryPageSize, readKeysetPages } from "@/lib/keyset-pages"

export type BoardListingRow = {
  id: string
  owner_id: string
  posted_at: string
  payload: unknown
  hidden_at?: string | null
  hidden_reason?: string | null
  expires_at?: string | null
  expiry_reminder_sent_at?: string | null
  status?: string | null
  sold_at?: string | null
  featured?: boolean | null
  featured_until?: string | null
  featured_paid?: boolean | null
  featured_promotion_id?: string | null
  sponsored?: boolean | null
  sponsored_locked?: boolean | null
}

/** Load only account-scoped inventory: the owner's ads plus explicitly saved ads. */
export async function readBoardInventory(
  db: SupabaseClient,
  owner: string,
  savedIds: string[] = [],
): Promise<BoardListingRow[]> {
  if (!/^[0-9a-f-]{36}$/i.test(owner)) throw new Error("Invalid inventory owner.")

  const owned = await readKeysetPages(async after => {
    let query = db.from("board_listings").select("*").eq("owner_id", owner)
      .order("id", { ascending: true }).limit(inventoryPageSize)
    if (after) query = query.gt("id", after)
    const { data, error } = await query.returns<BoardListingRow[]>()
    if (error) throw new Error(error.message)
    return data ?? []
  }, row => row.id)

  const byId = new Map(owned.map((row) => [row.id, row]))
  const uniqueSaved = [...new Set(savedIds.filter(Boolean))].filter((id) => !byId.has(id))
  const chunkSize = 100
  for (let index = 0; index < uniqueSaved.length; index += chunkSize) {
    const ids = uniqueSaved.slice(index, index + chunkSize)
    const { data, error } = await db.from("board_listings").select("*").in("id", ids).returns<BoardListingRow[]>()
    if (error) throw new Error(error.message)
    for (const row of data ?? []) byId.set(row.id, row)
  }

  return [...byId.values()].sort((a, b) => b.posted_at.localeCompare(a.posted_at) || b.id.localeCompare(a.id))
}

export async function readSavedListingIds(db: SupabaseClient, owner: string): Promise<string[]> {
  const rows = await readKeysetPages(async after => {
    let query = db.from("board_saves").select("listing_id,created_at").eq("owner_id", owner)
      .order("listing_id", { ascending: true }).limit(inventoryPageSize)
    if (after) query = query.gt("listing_id", after)
    const { data, error } = await query.returns<{ listing_id: string; created_at: string }[]>()
    if (error) throw new Error(error.message)
    return data ?? []
  }, row => row.listing_id)
  return rows.sort((a, b) => b.created_at.localeCompare(a.created_at) || a.listing_id.localeCompare(b.listing_id))
    .map(row => row.listing_id)
}

type SellerProfileRow = {
  user_id: string
  display_name: string | null
  avatar_url: string | null
  created_at: string | null
}

export async function readSellerProfileRows(db: SupabaseClient, userIds: string[]): Promise<SellerProfileRow[]> {
  const unique = [...new Set(userIds.filter(Boolean))]
  const rows: SellerProfileRow[] = []
  const profileBatchSize = 100
  // Bound IN-list URL lengths as well as row counts. The service may cap each
  // response below our chunk size, so each chunk also uses keyset traversal.
  for (let index = 0; index < unique.length; index += profileBatchSize) {
    const ids = unique.slice(index, index + profileBatchSize)
    rows.push(...await readKeysetPages(async after => {
      let query = db.from("board_profiles").select("user_id,display_name,avatar_url,created_at")
        .in("user_id", ids).order("user_id", { ascending: true }).limit(inventoryPageSize)
      if (after) query = query.gt("user_id", after)
      const { data, error } = await query.returns<SellerProfileRow[]>()
      if (error) throw new Error(error.message)
      return data ?? []
    }, row => row.user_id))
  }
  return rows
}
