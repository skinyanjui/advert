import { promotionDecisionSchema, readApiInput } from "@/lib/runtime-contracts"
import { canOwner } from "@/lib/access-control"
import { fail, ok } from "@/lib/api"
import { resolveMutationOwner, resolveOwner } from "@/lib/board-session"
import { finishPromotionRefund, listPromotions, promotionListOptions, promotionRpc } from "@/lib/promotion-store"
import type { Promotion } from "@/lib/promotions"

export const dynamic = "force-dynamic"
export async function GET(request: Request) {
  const owner = await resolveOwner(request)
  if (!owner || owner.kind !== "auth" || !canOwner(owner, "promotion:manage")) return fail("Admin access required.", 403)
  try { const { page, status } = promotionListOptions(request); return ok(await listPromotions(undefined, page, status)) }
  catch { return fail("Promotions could not be loaded.", 503) }
}
export async function PATCH(request: Request) {
  const owner = await resolveMutationOwner(request)
  if (!owner || owner.kind !== "auth" || !canOwner(owner, "promotion:manage")) return fail("Admin access required.", 403)
  try {
    const parsed = await readApiInput(request, promotionDecisionSchema)
    if (!parsed.ok) return fail(parsed.reason)
    const body = parsed.value
    if (body.action === "grant") {
      await promotionRpc("grant_board_promotion", { p_listing: body.listingId, p_actor: owner.id, p_days: body.days, p_reason: body.reason.trim() })
    } else {
      if (body.action === "retry_refund") await finishPromotionRefund(body.id)
      else {
        const result = await promotionRpc<Promotion>("decide_board_promotion", { p_id: body.id, p_actor: owner.id, p_action: body.action, p_reason: body.reason.trim() })
        if (result.status === "refund_pending") {
          try { await finishPromotionRefund(body.id) }
          catch { return fail("Decision saved; refund is pending. Retry the refund from this queue.", 502) }
        }
      }
    }
    return ok({ updated: true })
  } catch (error) { return fail(error instanceof Error ? error.message : "Promotion could not be updated.", 400) }
}
