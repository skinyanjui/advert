import { fail, ok, requireOwner } from "@/lib/api"
import { deleteListing, updateListing } from "@/lib/board-store"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type Context = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, context: Context) {
  const owner = requireOwner(request)
  if (!owner.ok) return owner.response
  const { id } = await context.params
  try {
    const body: unknown = await request.json()
    const result = updateListing(owner.token, id, body)
    if (!result.ok) return fail(result.reason, result.reason === "This ad is not yours." ? 403 : 400)
    return ok({ listing: result.value })
  } catch {
    return fail("The board database did not respond.", 500)
  }
}

export async function DELETE(request: Request, context: Context) {
  const owner = requireOwner(request)
  if (!owner.ok) return owner.response
  const { id } = await context.params
  try {
    const result = deleteListing(owner.token, id)
    if (!result.ok) return fail(result.reason, result.reason === "This ad is not yours." ? 403 : 400)
    return ok({})
  } catch {
    return fail("The board database did not respond.", 500)
  }
}
