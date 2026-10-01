import { fail, ok } from "@/lib/api"
import { canOwner } from "@/lib/access-control"
import { requireCurrentTerms } from "@/lib/terms-gate"
import { resolveMutationOwner } from "@/lib/board-session"
import { saveInputSchema, readApiInput } from "@/lib/runtime-contracts"
import { toggleSave } from "@/lib/board-store"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: Request) {
  const owner = await resolveMutationOwner(request)
  if (!canOwner(owner, "save") || !owner || owner.kind !== "auth") return fail("Sign in to save listings.", 401)
  const termsBlock = await requireCurrentTerms(owner.id)
  if (termsBlock) return termsBlock
  try {
    const parsed = await readApiInput(request, saveInputSchema)
    if (!parsed.ok) return fail(parsed.reason)
    const { listingId } = parsed.value
    const result = await toggleSave(owner.id, listingId)
    if (!result.ok) return fail(result.reason)
    return ok({ savedIds: result.value })
  } catch {
    return fail("The board database did not respond.", 500)
  }
}
