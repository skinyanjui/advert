import { fail, ok } from "@/lib/api"
import { isAdminEmail } from "@/lib/admin"
import { resolveOwner } from "@/lib/board-session"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** Lets the signed-in client know whether ADMIN_EMAILS includes their account. */
export async function GET(request: Request) {
  const owner = await resolveOwner(request)
  const admin = Boolean(owner?.kind === "auth" && isAdminEmail(owner.email))
  if (!owner || owner.kind !== "auth") return fail("Sign in required.", 401)
  return ok({ admin })
}
