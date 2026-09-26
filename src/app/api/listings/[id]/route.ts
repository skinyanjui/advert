import { fail, ok } from "@/lib/api"
import { mutationOwner } from "@/lib/board-session"
import { deleteListing, updateListing } from "@/lib/board-store"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type Context = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, context: Context) {
  const owner = mutationOwner(request)
  if (!owner) return fail("A valid browser session is required.", 403)
  const { id } = await context.params
  try {
    const body: unknown = await request.json()
    const result = await updateListing(owner, id, body)
    if (!result.ok) return fail(result.reason, result.reason === "This ad is not yours." ? 403 : 400)
    return ok({ listing: result.value })
  } catch {
    return fail("The board database did not respond.", 500)
  }
}

export async function DELETE(request: Request, context: Context) {
  const owner = mutationOwner(request)
  if (!owner) return fail("A valid browser session is required.", 403)
  const { id } = await context.params
  try {
    const result = await deleteListing(owner, id)
    if (!result.ok) return fail(result.reason, result.reason === "This ad is not yours." ? 403 : 400)
    return ok({})
  } catch {
    return fail("The board database did not respond.", 500)
  }
}
