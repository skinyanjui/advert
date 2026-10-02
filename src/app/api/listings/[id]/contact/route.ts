import { canOwner } from "@/lib/access-control"
import { fail, ok } from "@/lib/api"
import { resolveOwner } from "@/lib/board-session"
import { getListingDirectContact } from "@/lib/board-store"
import { requireCurrentTerms } from "@/lib/terms-gate"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const owner = await resolveOwner(request)
  if (!owner || owner.kind !== "auth" || !canOwner(owner, "contact:direct")) {
    return fail("Sign in to view seller contact.", 401)
  }
  const termsBlock = await requireCurrentTerms(owner.id)
  if (termsBlock) return termsBlock
  const { id } = await params
  try {
    const result = await getListingDirectContact(owner.id, id)
    if (!result.ok) {
      return fail(result.reason, /limit reached/i.test(result.reason) ? 429 : 404)
    }
    return ok({ contact: result.value })
  } catch {
    return fail("Seller contact is temporarily unavailable.", 500)
  }
}
