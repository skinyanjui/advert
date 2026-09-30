import { fail, ok } from "@/lib/api"
import { resolveMutationOwner } from "@/lib/board-session"
import { submitModerationAppeal } from "@/lib/moderation-redress"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: Request) {
  const owner = await resolveMutationOwner(request)
  if (!owner || owner.kind !== "auth") return fail("Sign in to appeal a moderation decision.", 401)
  try {
    const body = (await request.json()) as {
      moderationActionId?: unknown
      reason?: unknown
    }
    const moderationActionId =
      typeof body.moderationActionId === "string" ? body.moderationActionId.trim() : ""
    const reason = typeof body.reason === "string" ? body.reason : ""
    if (!moderationActionId) return fail("Choose a moderation decision.")
    const result = await submitModerationAppeal(owner.id, moderationActionId, reason)
    if (!result.ok) return fail(result.reason)
    return ok({ appeal: result.value })
  } catch {
    return fail("Could not submit the appeal.", 500)
  }
}
