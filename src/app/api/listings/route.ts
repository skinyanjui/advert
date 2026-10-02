import { canOwner } from "@/lib/access-control"
import { fail, ok } from "@/lib/api"
import { resolveMutationOwner } from "@/lib/board-session"
import { createListing, listPublicBoardPage } from "@/lib/board-store"
import { createListingAuthError } from "@/lib/listing-create-auth"
import { authConfigured } from "@/lib/supabase/env"\nimport { canonicalCountry } from "@/lib/countries"\nimport { isCategoryId } from "@/lib/types"
import { listingWriteSchema, readApiInput } from "@/lib/runtime-contracts"
import { requireCurrentTerms } from "@/lib/terms-gate"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const q = (url.searchParams.get("q") ?? "").trim().slice(0, 120)
  const country = canonicalCountry(url.searchParams.get("country"))
  const city = (url.searchParams.get("city") ?? "").trim().slice(0, 80)
  const categoryRaw = url.searchParams.get("category")
  const category = isCategoryId(categoryRaw) ? categoryRaw : undefined
  const type = (url.searchParams.get("type") ?? "").trim().slice(0, 80)
  const cursor = (url.searchParams.get("cursor") ?? "").trim().slice(0, 500)
  try {
    const page = await listPublicBoardPage({
      q: q || undefined,
      country,
      city: city || undefined,
      category,
      type: type || undefined,
      cursor: cursor || undefined,
    })
    return ok(page)
  } catch (error) {
    if (error instanceof Error && /cursor/i.test(error.message)) return fail("Invalid listings cursor.", 400)
    return fail("The listing search did not respond.", 500)
  }
}

export async function POST(request: Request) {
  const owner = await resolveMutationOwner(request)
  if (!owner) return fail("Sign in to post an ad.", 401)
  if (authConfigured() && !canOwner(owner, "post")) return fail("Sign in to post an ad.", 401)
  // Match the post form: when Auth is available, new ads require a signed-in account.
  // Cookie sessions still own legacy migration paths when Auth is not configured.
  const authError = createListingAuthError(owner.kind, authConfigured())
  if (authError) return fail(authError, 401)
  try {
    if (owner.kind === "auth") {
      const termsBlock = await requireCurrentTerms(owner.id)
      if (termsBlock) return termsBlock
    }
    const parsed = await readApiInput(request, listingWriteSchema)
    if (!parsed.ok) return fail(parsed.reason)
    const result = await createListing(owner.id, parsed.value)
    if (!result.ok) return fail(result.reason)
    return ok({ listing: result.value })
  } catch {
    return fail("The board database did not respond.", 500)
  }
}
