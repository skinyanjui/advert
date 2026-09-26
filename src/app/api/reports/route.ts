import { fail, ok } from "@/lib/api"
import { resolveMutationOwner } from "@/lib/board-session"
import { createReport } from "@/lib/board-store"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: Request) {
  const owner = await resolveMutationOwner(request)
  if (!owner) return fail("A valid browser session is required.", 403)
  try {
    const body = (await request.json()) as {
      listingId?: unknown
      reason?: unknown
      note?: unknown
    }
    const listingId = typeof body.listingId === "string" ? body.listingId : ""
    const reason = typeof body.reason === "string" ? body.reason : ""
    const note = typeof body.note === "string" ? body.note : ""
    const result = await createReport(owner.id, listingId, reason, note)
    if (!result.ok) return fail(result.reason)
    return ok({
      pendingCount: result.value.pendingCount,
      autoHidden: result.value.autoHidden,
    })
  } catch {
    return fail("The board database did not respond.", 500)
  }
}
