import { fail, ok } from "@/lib/api"
import { canOwner } from "@/lib/access-control"
import { requireCurrentTerms } from "@/lib/terms-gate"
import { resolveMutationOwner } from "@/lib/board-session"
import { reportInputSchema, readApiInput } from "@/lib/runtime-contracts"
import { createReport } from "@/lib/board-store"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: Request) {
  const owner = await resolveMutationOwner(request)
  if (!canOwner(owner, "report") || !owner || owner.kind !== "auth") return fail("Sign in to report a listing.", 401)
  const termsBlock = await requireCurrentTerms(owner.id)
  if (termsBlock) return termsBlock
  try {
    const parsed = await readApiInput(request, reportInputSchema)
    if (!parsed.ok) return fail(parsed.reason)
    const { listingId, reason, note, legalBasis, jurisdiction, goodFaith } = parsed.value
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
