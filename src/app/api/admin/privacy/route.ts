import { privacyRequestReviewSchema, readApiInput } from "@/lib/runtime-contracts"
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
    const parsed = await readApiInput(request, privacyRequestReviewSchema)
    if (!parsed.ok) return fail(parsed.reason)
    const { requestId, action } = parsed.value
    const resolution = parsed.value.resolution || null

    const result = await updatePrivacyRequest(
      admin.id,
      requestId,
      action,
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
