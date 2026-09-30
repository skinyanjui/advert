import { fail, ok } from "@/lib/api"
import { canOwner } from "@/lib/access-control"
import { requireCurrentTerms } from "@/lib/terms-gate"
import { resolveMutationOwner } from "@/lib/board-session"
import { createReport } from "@/lib/board-store"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: Request) {
  const owner = await resolveMutationOwner(request)
  if (!canOwner(owner, "report") || !owner || owner.kind !== "auth") return fail("Sign in to report a listing.", 401)
  const termsBlock = await requireCurrentTerms(owner.id)
  if (termsBlock) return termsBlock
  try {
    const body = (await request.json()) as {
      listingId?: unknown
      reason?: unknown
      note?: unknown
      legalBasis?: unknown
      jurisdiction?: unknown
      goodFaith?: unknown
    }
    const listingId = typeof body.listingId === "string" ? body.listingId : ""
    const reason = typeof body.reason === "string" ? body.reason : ""
    const note = typeof body.note === "string" ? body.note : ""
    const legalBasis = typeof body.legalBasis === "string" ? body.legalBasis : ""
    const jurisdiction = typeof body.jurisdiction === "string" ? body.jurisdiction : ""
    const goodFaith = body.goodFaith === true
    const result = await createReport(
      owner.id,
      listingId,
      reason,
      note,
      legalBasis,
      jurisdiction,
      goodFaith,
    )
    if (!result.ok) return fail(result.reason)
    return ok({
      pendingCount: result.value.pendingCount,
      autoHidden: result.value.autoHidden,
    })
  } catch {
    return fail("The board database did not respond.", 500)
  }
}
