import "server-only"

import { boardDb } from "@/lib/board-db"
import { isCategoryId } from "@/lib/category-registry"
import { isIndexableListing, listingSitemapIds, listingSitemapSize, readSitemapRows, type DiscoveryListing } from "@/lib/search-discovery"

const discoverySelect = "id,posted_at,expires_at,hidden_at,status,payload->category,payload->sold,payload->expiresAt"

function configured(): boolean {
  return Boolean((process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL)
    && (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY))
}

function publicQuery(now: string) {
  return boardDb().from("board_listings")
    .select(discoverySelect)
    .is("hidden_at", null)
    .eq("status", "active")
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order("id", { ascending: true })
}

export async function publicListingSitemapIds(): Promise<{ id: number }[]> {
  if (!configured()) return listingSitemapIds(0)
  const { count, error } = await boardDb().from("board_listings")
    .select("id", { count: "exact", head: true })
    .is("hidden_at", null)
    .eq("status", "active")
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
  if (error) throw new Error("Could not count public listings for search discovery.")
  return listingSitemapIds(count ?? 0)
}

export async function publicListingSitemapRows(id: string): Promise<DiscoveryListing[]> {
  if (!/^\d+$/.test(id) || !Number.isSafeInteger(Number(id))) return []
  if (!configured()) return []
  const now = new Date().toISOString()
  return readSitemapRows(async (from, to) => {
    const { data, error } = await publicQuery(now).range(from, to)
    if (error) throw new Error("Could not read public listings for search discovery.")
    return (data ?? []) as unknown as DiscoveryListing[]
  }, Number(id) * listingSitemapSize, listingSitemapSize)
}

/** Empty categories are not submitted to search engines as inventory pages. */
export async function publicInventoryCategories(): Promise<string[]> {
  if (!configured()) return []
  const now = new Date().toISOString()
  const categories = new Set<string>()
  let after = ""
  while (true) {
    let query = publicQuery(now).limit(250)
    if (after) query = query.gt("id", after)
    const { data, error } = await query
    if (error) throw new Error("Could not read public categories for search discovery.")
    const rows = (data ?? []) as unknown as (DiscoveryListing & { category?: string })[]
    if (!rows.length) break
    for (const row of rows) {
      if (isIndexableListing(row, Date.parse(now)) && isCategoryId(row.category)) categories.add(row.category)
    }
    after = rows[rows.length - 1].id
  }
  return [...categories].sort()
}

export async function categoryHasPublicInventory(category: string): Promise<boolean> {
  if (!configured() || !isCategoryId(category)) return false
  const now = new Date().toISOString()
  let after = ""
  while (true) {
    let query = publicQuery(now).eq("payload->>category", category).limit(250)
    if (after) query = query.gt("id", after)
    const { data, error } = await query
    if (error) throw new Error("Could not read public category inventory.")
    const rows = (data ?? []) as unknown as DiscoveryListing[]
    if (!rows.length) return false
    if (rows.some((row) => isIndexableListing(row, Date.parse(now)))) return true
    after = rows[rows.length - 1].id
  }
}
