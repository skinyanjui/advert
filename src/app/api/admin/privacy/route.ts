import { fail, ok } from "@/lib/api"
import { canOwner } from "@/lib/access-control"
import { resolveMutationOwner, resolveOwner } from "@/lib/board-session"
import {
  listPrivacyRequestsAdmin,
  updatePrivacyRequest,
} from "@/lib/privacy-requests"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

async function requireAdmin(request: Request, mutating: boolean) {
  const owner = mutating ? await resolveMutationOwner(request) : await resolveOwner(request)
  if (!canOwner(owner, "privacy:review") || !owner || owner.kind !== "auth") return undefined
  return owner
}

export async function GET(request: Request) {
  const admin = await requireAdmin(request, false)
  if (!admin) return fail("Admin access required.", 403)
  try {
    return ok({ requests: await listPrivacyRequestsAdmin() })
  } catch {
    return fail("Could not load privacy requests.", 500)
  }
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin(request, true)
  if (!admin) return fail("Admin access required.", 403)

  try {
    const body = (await request.json()) as {
      requestId?: unknown
      action?: unknown
      resolution?: unknown
    }
    const requestId = typeof body.requestId === "string" ? body.requestId.trim() : ""
    const action = typeof body.action === "string" ? body.action : ""
    const resolution =
      typeof body.resolution === "string" && body.resolution.trim()
        ? body.resolution.trim().slice(0, 2500)
        : null

    if (!requestId) return fail("Choose a privacy request.")
    if (!["verify", "start", "complete", "deny"].includes(action)) {
      return fail("Choose verify, start, complete, or deny.")
    }
    if ((action === "complete" || action === "deny") && !resolution) {
      return fail("Add a resolution note before completing or denying a request.")
    }

    const result = await updatePrivacyRequest(
      admin.id,
      requestId,
      action as "verify" | "start" | "complete" | "deny",
      resolution,
    )
    if (!result.ok) return fail(result.reason)

    return ok({
      request: result.value,
      requests: await listPrivacyRequestsAdmin(),
    })
  } catch {
    return fail("Could not update the privacy request.", 500)
  }
}
