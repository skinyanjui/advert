import { moderationAppealInputSchema, readApiInput } from "@/lib/runtime-contracts"
import { fail, ok } from "@/lib/api"
import { resolveMutationOwner } from "@/lib/board-session"
import { submitModerationAppeal } from "@/lib/moderation-redress"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: Request) {
  const owner = await resolveMutationOwner(request)
  if (!owner || owner.kind !== "auth") return fail("Sign in to appeal a moderation decision.", 401)
  try {
    const parsed = await readApiInput(request, moderationAppealInputSchema)
    if (!parsed.ok) return fail(parsed.reason)
    const { moderationActionId, reason } = parsed.value
    const result = await submitModerationAppeal(owner.id, moderationActionId, reason)
    if (!result.ok) return fail(result.reason)
    return ok({ appeal: result.value })
  } catch {
    return fail("Could not submit the appeal.", 500)
  }
}
