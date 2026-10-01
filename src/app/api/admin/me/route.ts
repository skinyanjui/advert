import { canOwner } from "@/lib/access-control"
import { fail, ok } from "@/lib/api"
import { resolveOwner } from "@/lib/board-session"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** Lets the signed-in client know whether its persisted role has administrative access. */
export async function GET(request: Request) {
  const owner = await resolveOwner(request)
  if (!owner || owner.kind !== "auth") return fail("Sign in required.", 401)
  return ok({ admin: canOwner(owner, "admin:access") })
}
