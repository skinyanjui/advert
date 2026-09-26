import { fail, ok } from "@/lib/api"
import { resolveMutationOwner } from "@/lib/board-session"
import { createListing } from "@/lib/board-store"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: Request) {
  const owner = await resolveMutationOwner(request)
  if (!owner) return fail("A valid browser session is required.", 403)
  try {
    const body: unknown = await request.json()
    const result = await createListing(owner.id, body)
    if (!result.ok) return fail(result.reason)
    return ok({ listing: result.value })
  } catch {
    return fail("The board database did not respond.", 500)
  }
}
