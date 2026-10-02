import { fail, ok } from "@/lib/api"
import { boardDb } from "@/lib/board-db"
import { cleanListing } from "@/lib/board-payload"
import { resolveOwner } from "@/lib/board-session"
import { requireCurrentTerms } from "@/lib/terms-gate"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type Context = { params: Promise<{ id: string }> }

export async function GET(request: Request, context: Context) {
  const owner = await resolveOwner(request)
  if (!owner || owner.kind !== "auth") return fail("Sign in to view seller contact options.", 401)
  const termsBlock = await requireCurrentTerms(owner.id)
  if (termsBlock) return termsBlock

  const { id } = await context.params
  if (!id || id.length > 80 || id.startsWith("sample-")) return fail("Contact is unavailable.", 404)

  try {
    const db = boardDb()
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count, error: countError } = await db.from("board_contact_reveals")
      .select("id", { count: "exact", head: true })
      .eq("viewer_id", owner.id)
      .gte("created_at", oneHourAgo)
    if (countError) return fail("Contact lookup is temporarily unavailable.", 503)
    if ((count ?? 0) >= 30) return fail("Too many contact lookups. Try again later.", 429)

    const { data: row, error } = await db.from("board_listings")
      .select("owner_id,payload,status,hidden_at,expires_at")
      .eq("id", id)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!row) return fail("Listing unavailable.", 404)

    const listing = cleanListing(row.payload)
    if (!listing) return fail("Listing unavailable.", 404)
    const isOwner = row.owner_id === owner.id
    const active = !row.hidden_at &&
      (row.status == null || row.status === "active") &&
      (!row.expires_at || new Date(row.expires_at).getTime() > Date.now())
    if (!isOwner && !active) return fail("Listing unavailable.", 404)

    const phone = listing.phone.trim()
    const contactPhone = Boolean(phone && listing.contactPhone !== false)
    const contactWhatsApp = Boolean(phone && listing.contactWhatsApp !== false)

    if (!isOwner) {
      const { error: revealError } = await db.from("board_contact_reveals").insert({
        viewer_id: owner.id,
        listing_id: id,
      })
      if (revealError) return fail("Contact lookup is temporarily unavailable.", 503)
    }

    return ok({ phone: contactPhone || contactWhatsApp ? phone : "", contactPhone, contactWhatsApp })
  } catch {
    return fail("Contact lookup is temporarily unavailable.", 503)
  }
}
