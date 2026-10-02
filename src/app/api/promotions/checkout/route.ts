import { promotionCheckoutSchema, readApiInput } from "@/lib/runtime-contracts"
import { canOwner } from "@/lib/access-control"
import { fail, ok } from "@/lib/api"
import { resolveMutationOwner } from "@/lib/board-session"
import { boardDb } from "@/lib/board-db"
import { promotionRpc } from "@/lib/promotion-store"
import { canCreatePromotionCheckout, type Promotion } from "@/lib/promotions"
import { checkoutBaseUrl, stripeRequest, type StripeSession } from "@/lib/stripe"
import { requireCurrentTerms } from "@/lib/terms-gate"
import { paidCheckoutReady } from "@/lib/checkout-readiness"
import { promotionCheckoutCopy } from "@/lib/promotion-checkout-copy"
import type { Locale } from "@/lib/i18n/locales"

export const runtime = "nodejs"
export async function POST(request: Request) {
  const owner = await resolveMutationOwner(request)
  if (!owner || owner.kind !== "auth" || !canOwner(owner, "post")) return fail("Sign in to feature your ad.", 401)
  try {
    const block = await requireCurrentTerms(owner.id)
    if (block) return block
    if (!await paidCheckoutReady()) return fail("Paid featuring is temporarily unavailable while payment support is verified.", 503)
    const base = checkoutBaseUrl()
    const parsed = await readApiInput(request, promotionCheckoutSchema)
    if (!parsed.ok) return fail(parsed.reason)
    const body = parsed.value
    const promotion = await promotionRpc<Promotion>("request_board_promotion", { p_listing: body.listingId, p_owner: owner.id })
    const { data: stored, error } = await boardDb().from("board_promotions").select("stripe_session_id").eq("id", promotion.id).single()
    if (error) throw new Error("Checkout could not be loaded.")
    let session: StripeSession
    if (stored.stripe_session_id) {
      session = await stripeRequest<StripeSession>(`checkout/sessions/${encodeURIComponent(stored.stripe_session_id)}`)
      if (session.status === "expired") {
        await promotionRpc("cancel_board_promotion_checkout", { p_id: promotion.id, p_session: session.id })
        return fail("Checkout expired. No payment was taken; retry to open a new checkout.", 409)
      }
      if (session.status !== "open") return fail("This checkout is being processed or has expired. Refresh promotion status before retrying.", 409)
    } else {
      if (!canCreatePromotionCheckout(promotion.created_at)) return fail("This checkout needs reconciliation in Stripe before retrying. Contact support; do not pay twice.", 409)
      const checkoutLanguage = await promotionRpc<Locale>("resolve_board_promotion_checkout_language", { p_id: promotion.id, p_owner: owner.id, p_language: body.language })
      const copy = promotionCheckoutCopy(checkoutLanguage, promotion.duration_days)
      const params = new URLSearchParams({
        mode: "payment",
        locale: copy.locale,
        "payment_method_types[0]": "card",
        "line_items[0][price_data][currency]": promotion.currency,
        "line_items[0][price_data][unit_amount]": String(promotion.amount),
        "line_items[0][price_data][product_data][name]": copy.name,
        "line_items[0][price_data][product_data][description]": copy.description,
        "line_items[0][quantity]": "1",
        "metadata[promotion_id]": promotion.id,
        "payment_intent_data[metadata][promotion_id]": promotion.id,
        success_url: `${base}/my-ads/featured?checkout=complete`,
        cancel_url: `${base}/my-ads/featured?checkout=cancelled`,
      })
      session = await stripeRequest<StripeSession>("checkout/sessions", params, `promotion-checkout-${promotion.id}`)
      await promotionRpc("bind_board_promotion_checkout", { p_id: promotion.id, p_session: session.id })
    }
    if (!session.url || new URL(session.url).hostname !== "checkout.stripe.com") throw new Error("Checkout URL is unavailable.")
    return ok({ url: session.url })
  } catch (error) {
    return fail(error instanceof Error && !/key|token|secret/i.test(error.message) ? error.message : "Checkout could not be created. Please retry.", 400)
  }
}
