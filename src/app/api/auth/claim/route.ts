import { fail, ok } from "@/lib/api"
import { resolveMutationOwner, sessionOwner } from "@/lib/board-session"
import { claimSession } from "@/lib/board-store"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: Request) {
  const owner = await resolveMutationOwner(request)
  if (!owner || owner.kind !== "auth") {
    return fail("Sign in to keep your ads on this account.", 401)
  }
  try {
    const sessionId = sessionOwner(request)
    const result = await claimSession(owner.id, sessionId, {
      email: owner.email,
      displayName: owner.email?.split("@")[0],
    })
    if (!result.ok) return fail(result.reason)
    return ok({ claim: result.value })
  } catch {
    return fail("Could not link this browser session to your account.", 500)
  }
}
