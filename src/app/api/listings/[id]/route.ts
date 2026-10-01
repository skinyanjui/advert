import { canOwner } from "@/lib/access-control"
import { fail, ok } from "@/lib/api"
import { resolveMutationOwner } from "@/lib/board-session"
import {
  deleteListing,
  renewListing,
  setListingPaused,
  setListingSold,
  updateListing,
} from "@/lib/board-store"
import { listingMutationSchema, readApiInput, type ListingMutationInput } from "@/lib/runtime-contracts"
import { requireCurrentTerms } from "@/lib/terms-gate"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type Context = { params: Promise<{ id: string }> }

export async function PATCH(request: Request, context: Context) {
  const owner = await resolveMutationOwner(request)
  // Guests must sign in to manage browser-session ads; claim moves them on sign-in.
  if (!canOwner(owner, "post") || !owner || owner.kind !== "auth") {
    return fail("Sign in to manage this ad.", 401)
  }
  const termsBlock = await requireCurrentTerms(owner.id)
  if (termsBlock) return termsBlock
  const { id } = await context.params
  try {
    const parsed = await readApiInput(request, listingMutationSchema)
    if (!parsed.ok) return fail(parsed.reason)
    const result = await patchListing(owner.id, id, parsed.value)
    if (!result.ok) return fail(result.reason, result.reason === "This ad is not yours." ? 403 : 400)
    return ok({ listing: result.value })
  } catch {
    return fail("The board database did not respond.", 500)
  }
}

export async function DELETE(request: Request, context: Context) {
  const owner = await resolveMutationOwner(request)
  if (!canOwner(owner, "post") || !owner || owner.kind !== "auth") {
    return fail("Sign in to manage this ad.", 401)
  }
  const termsBlock = await requireCurrentTerms(owner.id)
  if (termsBlock) return termsBlock
  const { id } = await context.params
  try {
    const result = await deleteListing(owner.id, id)
    if (!result.ok) return fail(result.reason, result.reason === "This ad is not yours." ? 403 : 400)
    return ok({})
  } catch {
    return fail("The board database did not respond.", 500)
  }
}

async function patchListing(owner: string, id: string, body: ListingMutationInput) {
  switch (body.kind) {
    case "sold": return setListingSold(owner, id, body.sold, body.resumeTo)
    case "paused": return setListingPaused(owner, id, body.paused)
    case "renew": return renewListing(owner, id)
    case "edit": return updateListing(owner, id, body.listing)
  }
}
