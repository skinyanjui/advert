import { fail, ok, requireOwner } from "@/lib/api"
import { createListing } from "@/lib/board-store"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: Request) {
  const owner = requireOwner(request)
  if (!owner.ok) return owner.response
  try {
    const body: unknown = await request.json()
    const result = createListing(owner.token, body)
    if (!result.ok) return fail(result.reason)
    return ok({ listing: result.value })
  } catch {
    return fail("The board database did not respond.", 500)
  }
}
