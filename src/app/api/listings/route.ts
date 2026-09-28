import { fail, ok } from "@/lib/api"
import { resolveMutationOwner } from "@/lib/board-session"
import { createListing } from "@/lib/board-store"
import { createListingAuthError } from "@/lib/listing-create-auth"
import { authConfigured } from "@/lib/supabase/env"
import { requireCurrentTerms } from "@/lib/terms-gate"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: Request) {
  const owner = await resolveMutationOwner(request)
  if (!owner) return fail("A valid browser session is required.", 403)
  // Match the post form: when Auth is available, new ads require a signed-in account.
  // Cookie sessions still own edits, saves, and claim migration for older guest posts.
  const authError = createListingAuthError(owner.kind, authConfigured())
  if (authError) return fail(authError, 401)
  if (owner.kind === "auth") {
    const termsBlock = await requireCurrentTerms(owner.id)
    if (termsBlock) return termsBlock
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
