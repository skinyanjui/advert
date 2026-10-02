import { fail, ok } from "@/lib/api"
import { boardDb } from "@/lib/board-db"
import { promotionRpc } from "@/lib/promotion-store"
import { signedStripeEvent, stripeRequest } from "@/lib/stripe"

export const runtime = "nodejs"
export async function POST(request: Request) {
  if (!process.env.STRIPE_WEBHOOK_SECRET) return fail("Webhook is not configured.", 503)
  if (Number(request.headers.get("content-length") ?? 0) > 1048576) return fail("Webhook is too large.", 413)
  const text = await request.text()
  if (text.length > 1048576) return fail("Webhook is too large.", 413)
  let event
  try { event = signedStripeEvent(text, request.headers.get("stripe-signature") ?? "") }
  catch { return fail("Invalid webhook.", 400) }
  if (!event) return fail("Invalid webhook signature.", 400)
  try {
    const object = event.data.object
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const metadata = object.metadata as { promotion_id?: string } | undefined
      // This endpoint may share a Stripe account with unrelated checkouts.
      if (!metadata?.promotion_id) return ok({ received: true })
      if (object.payment_status !== "paid") return ok({ received: true })
      if (typeof object.id !== "string" || typeof object.payment_intent !== "string" || typeof object.amount_total !== "number" || typeof object.currency !== "string") return fail("Incomplete payment.")
      // Stripe can deliver events out of order. Check current charge state so a
      // refunded checkout cannot become pending again from a late payment event.
      const intent = await stripeRequest<{ status: string; amount: number; currency: string; latest_charge: { refunded: boolean } | null }>(`payment_intents/${encodeURIComponent(object.payment_intent)}?expand[]=latest_charge`)
      if (intent.status !== "succeeded" || intent.amount !== object.amount_total || intent.currency !== object.currency) return fail("Payment is not confirmed.", 409)
      await promotionRpc("pay_board_promotion", { p_id: metadata.promotion_id, p_session: object.id, p_intent: object.payment_intent, p_amount: object.amount_total, p_currency: object.currency, p_refunded: intent.latest_charge?.refunded === true })
    } else if (event.type === "checkout.session.expired") {
      const metadata = object.metadata as { promotion_id?: string } | undefined
      if (metadata?.promotion_id && typeof object.id === "string") {
        await promotionRpc("cancel_board_promotion_checkout", { p_id: metadata.promotion_id, p_session: object.id })
      }
    } else if (event.type === "refund.updated" || event.type === "refund.created") {
      if ((object.status === "failed" || object.status === "canceled") && typeof object.payment_intent === "string" && typeof object.id === "string") {
        await promotionRpc("fail_board_promotion_refund", { p_intent: object.payment_intent, p_refund: object.id })
      }
      if (object.status === "succeeded" && typeof object.payment_intent === "string" && typeof object.id === "string") {
        const { data: row, error } = await boardDb().from("board_promotions").select("amount").eq("stripe_payment_intent", object.payment_intent).maybeSingle()
        if (error) throw new Error(error.message)
        if (row && object.amount === row.amount) await promotionRpc("refund_board_promotion", { p_intent: object.payment_intent, p_refund: object.id })
      }
    } else if (event.type === "charge.refunded" && object.refunded === true && typeof object.payment_intent === "string") {
      // Full refunds initiated in the Stripe dashboard also remove paid ranking.
      const refunds = object.refunds as { data?: { id: string }[] } | undefined
      await promotionRpc("refund_board_promotion", { p_intent: object.payment_intent, p_refund: refunds?.data?.[0]?.id ?? null })
    }
    return ok({ received: true })
  } catch {
    // Non-2xx tells Stripe to retry; duplicate delivery is handled transactionally.
    return fail("Webhook processing failed. Retry delivery.", 500)
  }
}
