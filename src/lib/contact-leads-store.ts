import "server-only"

import { boardDb } from "@/lib/board-db"
import { contactAnalyticsPolicy, type ContactLeadOptions, type ContactLeadStats } from "@/lib/contact-leads"

export async function listContactLeads(ownerId: string, options: ContactLeadOptions) {
  const { data, error } = await boardDb().rpc("seller_contact_leads", {
    p_owner: ownerId,
    p_listing_ids: options.listingIds ?? null,
    p_offset: options.page * contactAnalyticsPolicy.pageSize,
    p_limit: contactAnalyticsPolicy.pageSize + 1,
  })
  if (error) throw new Error(error.message)
  const rows = (data ?? []) as ContactLeadStats[]
  return { rows: rows.slice(0, contactAnalyticsPolicy.pageSize), hasMore: rows.length > contactAnalyticsPolicy.pageSize }
}

export async function expireContactEventsIfAvailable(): Promise<number> {
  const { data, error } = await boardDb().rpc("expire_board_contact_events")
  if (error && ["42883", "PGRST202"].includes(error.code)) return 0
  if (error) throw new Error(error.message)
  return Number(data ?? 0)
}
