import { canOwner } from "@/lib/access-control"
import { fail, ok } from "@/lib/api"
import { listAccountDeletionJobs } from "@/lib/account-deletion"
import { resolveOwner } from "@/lib/board-session"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: Request) {
  const owner = await resolveOwner(request)
  if (!canOwner(owner, "compliance:manage")) return fail("Administrator access required.", 403)
  try {
    return ok({ jobs: await listAccountDeletionJobs() })
  } catch {
    return fail("Could not load account deletion reconciliation.", 500)
  }
}
