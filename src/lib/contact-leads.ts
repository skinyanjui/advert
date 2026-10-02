import { canOwner } from "@/lib/access-control"
import type { BoardOwner } from "@/lib/board-session"
import { isTrackableListingId } from "@/lib/contact-event-types"
import { marketplacePolicy } from "@/lib/marketplace-policy"

export const contactAnalyticsPolicy = marketplacePolicy.contactAnalytics

export type ContactLeadStats = {
  listing_id: string
  listing_title: string
  listing_status: string
  views: number
  contacts: number
  whatsapp: number
  calls: number
  texts: number
  messages: number
}

export type ContactLeadOptions = { page: number; listingIds?: string[] }

export function contactLeadOptions(request: Request): ContactLeadOptions | null {
  const query = new URL(request.url).searchParams
  const page = Number(query.get("page") ?? "0")
  const listingIds = query.getAll("listingId")
  if (!Number.isSafeInteger(page) || page < 0 || page > 100_000 || listingIds.length > contactAnalyticsPolicy.pageSize || listingIds.some(id => !isTrackableListingId(id))) return null
  return { page, ...(listingIds.length ? { listingIds: [...new Set(listingIds)] } : {}) }
}

type Dependencies = {
  resolveOwner: (request: Request) => Promise<BoardOwner | undefined>
  requireCurrentTerms: (userId: string) => Promise<Response | null>
  list: (ownerId: string, options: ContactLeadOptions) => Promise<{ rows: ContactLeadStats[]; hasMore: boolean }>
}

/** The same handler is used by the route and permission-boundary tests. */
export async function contactLeadsResponse(request: Request, dependencies: Dependencies): Promise<Response> {
  const headers = { "cache-control": "private, no-store" }
  const fail = (reason: string, status: number) => Response.json({ ok: false, reason }, { status, headers })
  try {
    const owner = await dependencies.resolveOwner(request)
    if (!owner || owner.kind !== "auth" || !canOwner(owner, "profile")) return fail("Sign in to see your contact leads.", 401)
    const block = await dependencies.requireCurrentTerms(owner.id)
    if (block) return block
    const options = contactLeadOptions(request)
    if (!options) return fail("Choose a valid page and up to 50 listing IDs.", 400)
    return Response.json({ ok: true, ...await dependencies.list(owner.id, options), retentionDays: contactAnalyticsPolicy.retentionDays }, { headers })
  } catch {
    return fail("Contact leads are temporarily unavailable.", 503)
  }
}
