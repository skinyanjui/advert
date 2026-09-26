import { fail, ok } from "@/lib/api"
import { mutationOwner } from "@/lib/board-session"
import { toggleSave } from "@/lib/board-store"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: Request) {
  const owner = mutationOwner(request)
  if (!owner) return fail("A valid browser session is required.", 403)
  try {
    const body = (await request.json()) as { listingId?: unknown }
    const listingId = typeof body.listingId === "string" ? body.listingId : ""
    const result = await toggleSave(owner, listingId)
    if (!result.ok) return fail(result.reason)
    return ok({ savedIds: result.value })
  } catch {
    return fail("The board database did not respond.", 500)
  }
}
