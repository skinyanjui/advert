import { canOwner } from "@/lib/access-control"
import { fail, ok } from "@/lib/api"
import { resolveOwner } from "@/lib/board-session"
import { listPromotions, promotionListOptions } from "@/lib/promotion-store"
import { paidFeaturingConfigured } from "@/lib/stripe"
import { featuredPackage } from "@/lib/promotions"
import { requireCurrentTerms } from "@/lib/terms-gate"

export const dynamic = "force-dynamic"
export async function GET(request: Request) {
  const owner = await resolveOwner(request)
  if (!owner || owner.kind !== "auth" || !canOwner(owner, "profile")) return fail("Sign in to manage featured ads.", 401)
  try {
    const block = await requireCurrentTerms(owner.id)
    if (block) return block
    const { page, status } = promotionListOptions(request)
    return ok({ ...await listPromotions(owner.id, page, status), package: featuredPackage, checkoutAvailable: paidFeaturingConfigured() })
  } catch { return fail("Promotions could not be loaded. Check the database migration.", 503) }
}
