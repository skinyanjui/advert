import { fail, ok } from "@/lib/api"
import { resolveMutationOwner } from "@/lib/board-session"
import {
  deleteListing,
  renewListing,
  setListingPaused,
  setListingSold,
  updateListing,
} from "@/lib/board-store"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type Context = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, context: Context) {
  const owner = await resolveMutationOwner(request)
  if (!owner) return fail("A valid browser session is required.", 403)
  const { id } = await context.params
  try {
    const body: unknown = await request.json()
    const result = await patchListing(owner.id, id, body)
    if (!result.ok) return fail(result.reason, result.reason === "This ad is not yours." ? 403 : 400)
    return ok({ listing: result.value })
  } catch {
    return fail("The board database did not respond.", 500)
  }
}

export async function DELETE(request: Request, context: Context) {
  const owner = await resolveMutationOwner(request)
  if (!owner) return fail("A valid browser session is required.", 403)
  const { id } = await context.params
  try {
    const result = await deleteListing(owner.id, id)
    if (!result.ok) return fail(result.reason, result.reason === "This ad is not yours." ? 403 : 400)
    return ok({})
  } catch {
    return fail("The board database did not respond.", 500)
  }
}

async function patchListing(owner: string, id: string, body: unknown) {
  if (body && typeof body === "object" && !Array.isArray(body)) {
    const action = body as { sold?: unknown; renew?: unknown; paused?: unknown; resumeTo?: unknown }
    if (typeof action.sold === "boolean") {
      const resumeTo = action.resumeTo === "paused" || action.resumeTo === "active" ? action.resumeTo : undefined
      return setListingSold(owner, id, action.sold, resumeTo)
    }
    if (typeof action.paused === "boolean") return setListingPaused(owner, id, action.paused)
    if (action.renew === true) return renewListing(owner, id)
  }
  return updateListing(owner, id, body)
}
