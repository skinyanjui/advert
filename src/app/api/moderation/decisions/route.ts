import { fail, ok } from "@/lib/api"
import { resolveOwner } from "@/lib/board-session"
import { listModerationDecisionsForUser } from "@/lib/moderation-redress"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: Request) {
  const owner = await resolveOwner(request)
  if (!owner || owner.kind !== "auth") return fail("Sign in to view moderation decisions.", 401)
  try {
    return ok({ decisions: await listModerationDecisionsForUser(owner.id) })
  } catch {
    return fail("Could not load moderation decisions.", 500)
  }
}
