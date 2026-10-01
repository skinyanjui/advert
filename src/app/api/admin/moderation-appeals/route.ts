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
    const body = (await request.json()) as {
      appealId?: unknown
      outcome?: unknown
      resolution?: unknown
    }
    const appealId = typeof body.appealId === "string" ? body.appealId.trim() : ""
    const outcome = typeof body.outcome === "string" ? body.outcome : ""
    const resolution =
      typeof body.resolution === "string" ? body.resolution.trim().slice(0, 2500) : ""
    if (!appealId) return fail("Choose an appeal.")
    if (outcome !== "uphold" && outcome !== "reverse") return fail("Choose uphold or reverse.")
    if (!resolution) return fail("Add a reasoned resolution before deciding the appeal.")
    const result = await reviewModerationAppeal(admin.id, appealId, outcome, resolution)
    if (!result.ok) return fail(result.reason)
    return ok({ appeals: await listModerationAppealsAdmin() })
  } catch {
    return fail("Could not review the appeal.", 500)
  }
}
