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

export const publicBoardPageSize = 48
export const ownerInventoryLimit = 200
export const savedListingLimit = 500

type PublicCursor = { postedAt: string; id: string }

export type PublicBoardFilters = {
  q?: string
  country?: string
  city?: string
  category?: string
  type?: string
  cursor?: string
}

export type PublicBoardPage = {
  rows: BoardListingRow[]
  nextCursor: string | null
}

function encodeCursor(row: BoardListingRow): string {
  return Buffer.from(JSON.stringify({ postedAt: row.posted_at, id: row.id } satisfies PublicCursor)).toString("base64url")
}

function decodeCursor(value: string | undefined): PublicCursor | null {
  if (!value || value.length > 500) return null
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<PublicCursor>
    if (
      typeof parsed.postedAt !== "string" ||
      !Number.isFinite(Date.parse(parsed.postedAt)) ||
      typeof parsed.id !== "string" ||
      !/^ad-[a-zA-Z0-9-]{1,64}$/.test(parsed.id)
    ) return null
    return { postedAt: parsed.postedAt, id: parsed.id }
  } catch {
    return null
  }
}

/** Bounded private inventory for account-management surfaces only. */
export async function readOwnedInventory(db: SupabaseClient, owner: string): Promise<BoardListingRow[]> {
  if (!/^[0-9a-f-]{36}$/i.test(owner)) throw new Error("Invalid inventory owner.")
  const { data, error } = await db.from("board_listings")
    .select("*")
    .eq("owner_id", owner)
    .order("posted_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(ownerInventoryLimit)
    .returns<BoardListingRow[]>()
  if (error) throw new Error(error.message)
  return data ?? []
}

/** Public browse is server-filtered and cursor-paginated. */
export async function readPublicBoardPage(db: SupabaseClient, filters: PublicBoardFilters): Promise<PublicBoardPage> {
  const now = new Date().toISOString()
  let query = db.from("board_listings")
    .select("*")
    .eq("status", "active")
    .is("hidden_at", null)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order("posted_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(publicBoardPageSize + 1)

  if (filters.country) query = query.eq("country_code", filters.country)
  if (filters.category) query = query.eq("payload->>category", filters.category)
  if (filters.type) query = query.eq("payload->>subcategory", filters.type)
  if (filters.city) query = query.ilike("payload->>city", filters.city)
  if (filters.q) query = query.textSearch("search_document", filters.q, { type: "websearch", config: "simple" })

  const cursor = decodeCursor(filters.cursor)
  if (filters.cursor && !cursor) throw new Error("Invalid public listings cursor.")
  if (cursor) {
    query = query.or(`posted_at.lt.${cursor.postedAt},and(posted_at.eq.${cursor.postedAt},id.lt.${cursor.id})`)
  }

  const { data, error } = await query.returns<BoardListingRow[]>()
  if (error) throw new Error(error.message)
  const rows = data ?? []
  const pageRows = rows.slice(0, publicBoardPageSize)
  return {
    rows: pageRows,
    nextCursor: rows.length > publicBoardPageSize && pageRows.length > 0
      ? encodeCursor(pageRows[pageRows.length - 1]!)
      : null,
  }
}

export async function readSavedListingIds(db: SupabaseClient, owner: string): Promise<string[]> {
  const { data, error } = await db.from("board_saves")
    .select("listing_id,created_at")
    .eq("owner_id", owner)
    .order("created_at", { ascending: false })
    .limit(savedListingLimit)
    .returns<{ listing_id: string; created_at: string }[]>()
  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => row.listing_id)
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
