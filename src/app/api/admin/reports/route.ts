import { fail, ok } from "@/lib/api"
import { isAdminEmail } from "@/lib/admin"
import { resolveMutationOwner, resolveOwner } from "@/lib/board-session"
import {
  dismissReport,
  hideListingForReport,
  listPendingReports,
  removeListingForReport,
} from "@/lib/board-store"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

async function requireAdmin(request: Request, mutating: boolean) {
  const owner = mutating ? await resolveMutationOwner(request) : await resolveOwner(request)
  if (!owner || owner.kind !== "auth" || !isAdminEmail(owner.email)) {
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
    const body = (await request.json()) as {
      reportId?: unknown
      action?: unknown
    }
    const reportId = typeof body.reportId === "string" ? body.reportId : ""
    const action = typeof body.action === "string" ? body.action : ""
    if (!reportId) return fail("Choose a report.")

    let result
    if (action === "dismiss") result = await dismissReport(admin.id, reportId)
    else if (action === "hide") result = await hideListingForReport(admin.id, reportId)
    else if (action === "remove") result = await removeListingForReport(admin.id, reportId)
    else return fail("Choose dismiss, hide, or remove.")
    if (!result.ok) return fail(result.reason)
    const reports = await listPendingReports()
    return ok({ reports })
  } catch {
    return fail("The board database did not respond.", 500)
  }
}
