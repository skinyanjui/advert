import { canOwner } from "@/lib/access-control"
import { fail, ok } from "@/lib/api"
import { boardDb } from "@/lib/board-db"
import { resolveOwner } from "@/lib/board-session"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: Request) {
  const owner = await resolveOwner(request)
  if (!owner || owner.kind !== "auth" || !canOwner(owner, "admin:access")) {
    return fail("Admin access required.", 403)
  }
  const { data, error } = await boardDb().from("support_requests")
    .select("id,email,category,subject,message,status,created_at,updated_at")
    .order("created_at", { ascending: true })
    .limit(200)
  if (error) return fail("Could not load the support queue.", 503)
  return ok({ requests: data ?? [] })
}
