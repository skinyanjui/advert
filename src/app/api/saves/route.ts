import { fail, ok, requireOwner } from "@/lib/api"
import { toggleSave } from "@/lib/board-store"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: Request) {
  const owner = requireOwner(request)
  if (!owner.ok) return owner.response
  try {
    const body = (await request.json()) as { listingId?: unknown }
    const listingId = typeof body.listingId === "string" ? body.listingId : ""
    const result = toggleSave(owner.token, listingId)
    if (!result.ok) return fail(result.reason)
    return ok({ savedIds: result.value })
  } catch {
    return fail("The board database did not respond.", 500)
  }
}
