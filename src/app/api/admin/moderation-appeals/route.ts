import { moderationAppealReviewSchema, readApiInput } from "@/lib/runtime-contracts"
import { canOwner } from "@/lib/access-control"
import { fail, ok } from "@/lib/api"
import { resolveMutationOwner, resolveOwner } from "@/lib/board-session"
import {
  listModerationAppealsAdmin,
  reviewModerationAppeal,
} from "@/lib/moderation-redress"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

async function requireAdmin(request: Request, mutating: boolean) {
  const owner = mutating ? await resolveMutationOwner(request) : await resolveOwner(request)
  if (!canOwner(owner, "moderation:review") || !owner || owner.kind !== "auth") return undefined
  return owner
}

export async function GET(request: Request) {
  const admin = await requireAdmin(request, false)
  if (!admin) return fail("Admin access required.", 403)
  try {
    return ok({ appeals: await listModerationAppealsAdmin() })
  } catch {
    return fail("Could not load moderation appeals.", 500)
  }
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin(request, true)
  if (!admin) return fail("Admin access required.", 403)
  try {
    const parsed = await readApiInput(request, moderationAppealReviewSchema)
    if (!parsed.ok) return fail(parsed.reason)
    const { appealId, outcome, resolution } = parsed.value
    const result = await reviewModerationAppeal(admin.id, appealId, outcome, resolution)
    if (!result.ok) return fail(result.reason)
    return ok({ appeals: await listModerationAppealsAdmin() })
  } catch {
    return fail("Could not review the appeal.", 500)
  }
}
