import { canOwner } from "@/lib/access-control"
import { fail, ok } from "@/lib/api"
import { resolveOwner } from "@/lib/board-session"
import { listSupportRequests } from "@/lib/support-store"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: Request) {
  const owner = await resolveOwner(request)
  if (!canOwner(owner, "compliance:manage")) return fail("Administrator access required.", 403)
  try {
    return ok({ requests: await listSupportRequests() })
  } catch {
    return fail("Could not load the support queue.", 500)
  }
}
