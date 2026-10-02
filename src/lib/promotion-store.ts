import "server-only"
import { promotionListSchema } from "@/lib/runtime-contracts"
import { boardDb } from "@/lib/board-db"
import { promotionReviewOverdue } from "@/lib/promotion-notifications"
import type { Promotion } from "@/lib/promotions"
import { stripeRequest } from "@/lib/stripe"

export async function promotionRpc<T>(name: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await boardDb().rpc(name, args)
  if (error) throw new Error(error.message)
  return data as T
}

export async function listPromotions(owner?: string, page = 0, status = "all"): Promise<{ promotions: Promotion[]; total: number }> {
  let query = boardDb().from("board_promotions").select("id,listing_id,owner_id,status,paid,amount,currency,duration_days,created_at,starts_at,ends_at,decision_reason,paid_at,review_due_at,refund_attempts,refund_last_error,refund_next_attempt_at", { count: "exact" }).order("created_at", { ascending: false }).range(page * 50, page * 50 + 49)
  if (owner) query = query.eq("owner_id", owner)
  if (status === "active") query = query.eq("status", "active").gt("ends_at", new Date().toISOString())
  else if (status === "expired") query = query.or(`status.eq.expired,and(status.eq.active,ends_at.lte.${new Date().toISOString()})`)
  else if (status !== "all") query = query.eq("status", status)
  const { data, error, count: total } = await query
  if (error) throw new Error(error.message)
  const rows = (data ?? []) as Promotion[]
  if (!rows.length) return { promotions: [], total: total ?? 0 }
  // Counts are aggregated by the database, not capped by PostgREST's row limit.
  const { data: counts, error: countError } = await boardDb().rpc("board_promotion_stats", { p_ids: rows.map(row => row.id) })
  if (countError) throw new Error(countError.message)
  const { data: decisions, error: decisionError } = await boardDb().from("board_promotion_decisions").select("promotion_id,action,reason,created_at").in("promotion_id", rows.map(row => row.id)).order("created_at", { ascending: true })
  if (decisionError) throw new Error(decisionError.message)
  let noticeQuery = boardDb().from("board_promotion_notifications").select("promotion_id,kind,status,attempts,created_at,delivered_at").in("promotion_id", rows.map(row => row.id)).order("created_at", { ascending: true })
  if (owner) noticeQuery = noticeQuery.eq("audience", "seller")
  const { data: notices, error: noticeError } = await noticeQuery
  if (noticeError) throw new Error(noticeError.message)
  const promotions: Promotion[] = rows.map(row => {
    const count = (counts ?? []).find((item: { promotion_id: string }) => item.promotion_id === row.id)
    return { ...row, refund_last_error: owner ? null : row.refund_last_error, review_overdue: promotionReviewOverdue(row), notifications: (notices ?? []).filter(item => item.promotion_id === row.id).map(({ kind, status, attempts, created_at, delivered_at }) => ({ kind, status, attempts, created_at, delivered_at })), decisions: (decisions ?? []).filter(item => item.promotion_id === row.id).map(({ action, reason, created_at }) => ({ action, reason, created_at })), status: row.status === "active" && Date.parse(row.ends_at ?? "") <= Date.now() ? "expired" : row.status, impressions: Number(count?.impressions ?? 0), clicks: Number(count?.clicks ?? 0) }
  })
  return { promotions, total: total ?? 0 }
}

export async function finishPromotionRefund(id: string, manual = false) {
  const claimed = await promotionRpc<Array<{ stripe_payment_intent: string; stripe_refund_id: string | null; refund_lease: string }>>("claim_board_promotion_refund", { p_id: id, p_manual: manual })
  const row = claimed[0]
  if (!row) return // Another worker owns it, it is complete, or automatic retries are exhausted.
  let refundId: string | null = null
  try {
    let refund = row.stripe_refund_id
      ? await stripeRequest<{ id: string; status: string }>(`refunds/${encodeURIComponent(row.stripe_refund_id)}`)
      : await stripeRequest<{ id: string; status: string }>("refunds", new URLSearchParams({ payment_intent: row.stripe_payment_intent }), `promotion-refund-${id}`)
    if (refund.status === "failed" || refund.status === "canceled") {
      // The same failed provider attempt always produces the same retry key.
      refund = await stripeRequest<{ id: string; status: string }>("refunds", new URLSearchParams({ payment_intent: row.stripe_payment_intent }), `promotion-refund-${id}-after-${refund.id}`)
    }
    refundId = refund.id
    if (["failed", "canceled", "requires_action"].includes(refund.status)) throw new Error("Stripe refund needs attention. Review and retry.")
    if (refund.status === "succeeded") await promotionRpc("refund_board_promotion", { p_intent: row.stripe_payment_intent, p_refund: refund.id })
    else await promotionRpc("complete_board_promotion_refund_attempt", { p_id: id, p_lease: row.refund_lease, p_refund: refund.id, p_error: null })
  } catch {
    // Avoid retaining raw provider errors, which can contain account details.
    await promotionRpc("complete_board_promotion_refund_attempt", { p_id: id, p_lease: row.refund_lease, p_refund: refundId, p_error: "Refund could not be confirmed. Check Stripe and retry from the promotion queue." })
    throw new Error("Refund could not be confirmed. An admin alert has been queued.")
  }
}

/** Checkout must stay disabled until the transactional outbox migration is live. */
export async function promotionOperationsReady(): Promise<boolean> {
  try {
    const { data, error } = await boardDb().rpc("board_promotion_operations_ready")
    return !error && data === true
  } catch { return false }
}

export function promotionListOptions(request: Request) {
  const params = new URL(request.url).searchParams
  return promotionListSchema.parse({ page: params.get("page") ?? undefined, status: params.get("status") ?? undefined })
}

/** Keep the existing cron working before the optional promotion migration. */
export async function expirePromotionsIfAvailable(): Promise<number> {
  const { data, error } = await boardDb().rpc("expire_board_promotions")
  if (error && ["42883", "PGRST202"].includes(error.code)) return 0
  if (error) throw new Error(error.message)
  return Number(data)
}
