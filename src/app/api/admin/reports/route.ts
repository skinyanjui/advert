import { reportReviewSchema, readApiInput } from "@/lib/runtime-contracts"
import { canOwner } from "@/lib/access-control"
import { fail, ok } from "@/lib/api"
import { resolveMutationOwner, resolveOwner } from "@/lib/board-session"
import {
  dismissReport,
  hideListingForReport,
  listPendingReports,
  markListingSponsoredForReport,
  removeListingForReport,
} from "@/lib/board-store"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

async function requireAdmin(request: Request, mutating: boolean) {
  const owner = mutating ? await resolveMutationOwner(request) : await resolveOwner(request)
  if (!canOwner(owner, "moderation:review") || !owner || owner.kind !== "auth") {
    return undefined
  }
  return owner
}

export async function GET(request: Request) {
  const admin = await requireAdmin(request, false)
  if (!admin) return fail("Admin access required.", 403)
  try {
    const reports = await listPendingReports()
    return ok({ reports })
  } catch {
    return fail("The board database did not respond.", 500)
  }
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin(request, true)
  if (!admin) return fail("Admin access required.", 403)
  try {
    const parsed = await readApiInput(request, reportReviewSchema)
    if (!parsed.ok) return fail(parsed.reason)
    const { reportId, action } = parsed.value
    const decisionReason = parsed.value.decisionReason || null

    let result
    if (action === "dismiss") result = await dismissReport(admin.id, reportId)
    else if (action === "hide") result = await hideListingForReport(admin.id, reportId, decisionReason)
    else if (action === "remove") result = await removeListingForReport(admin.id, reportId, decisionReason)
    else if (action === "mark_sponsored") result = await markListingSponsoredForReport(admin.id, reportId)
    else return fail("Choose dismiss, hide, remove, or mark sponsored.")
    if (!result.ok) return fail(result.reason)
    const reports = await listPendingReports()
    return ok({ reports })
  } catch {
    return fail("The board database did not respond.", 500)
  }
}
