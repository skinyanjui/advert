import { fail, ok } from "@/lib/api"
import { resolveMutationOwner } from "@/lib/board-session"
import { createListing } from "@/lib/board-store"
import { authConfigured } from "@/lib/supabase/env"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: Request) {
  const owner = await resolveMutationOwner(request)
  if (!owner) return fail("A valid browser session is required.", 403)
  // When Auth is available, new ads require a signed-in account. Guests must sign in
  // to manage older browser-session ads too (PATCH/DELETE); claim moves them on sign-in.
  if (authConfigured() && owner.kind !== "auth") {
    return fail("Sign in to post an ad.", 401)
  }
  try {
    const body: unknown = await request.json()
    const result = await createListing(owner.id, body)
    if (!result.ok) return fail(result.reason)
    return ok({ listing: result.value })
  } catch {
    return fail("The board database did not respond.", 500)
  }
}
