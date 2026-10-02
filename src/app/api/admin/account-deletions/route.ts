import { canOwner } from "@/lib/access-control"
import { fail, ok } from "@/lib/api"
import { listAccountDeletionJobs } from "@/lib/account-deletion"
import { resolveOwner } from "@/lib/board-session"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: Request) {
  const owner = await resolveOwner(request)
  if (!owner || owner.kind !== "auth" || !canOwner(owner, "admin:access")) {
    return fail("Admin access required.", 403)
  }
  try {
    return ok({ jobs: await listAccountDeletionJobs() })
  } catch {
    return fail("Could not load account deletion reconciliation status.", 503)
  }
}
