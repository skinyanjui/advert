import type { Promotion } from "@/lib/promotions"

export type PromotionNotification = {
  id: string
  promotion_id: string
  owner_id: string
  audience: "seller" | "admin"
  kind: string
  lease: string
  payload: { listing_id?: string; reason?: string; review_due_at?: string; ends_at?: string }
}

/** Plain text is intentional: decision reasons are untrusted user content. */
export function promotionNotificationMessage(job: PromotionNotification, baseUrl: string) {
  const title: Record<string, string> = {
    payment_received: "Payment received: your featured ad is awaiting review",
    approved: "Your featured ad has been approved",
    rejected: "Your featured request was rejected: full refund requested",
    removed: "Your featured placement has been removed",
    granted: "Your ad received a complimentary featured placement",
    refunded: "Your featured payment has been refunded",
    refund_failed: "Action needed: a featured payment refund failed",
    review_overdue: "Action needed: a featured request is overdue for review",
  }
  const lines = [title[job.kind] ?? "Your featured request was updated", `Listing: ${job.payload.listing_id ?? job.promotion_id}`]
  if (job.payload.reason) lines.push(`Decision: ${job.payload.reason}`)
  if (job.kind === "payment_received" && job.payload.review_due_at) lines.push(`Review target: ${job.payload.review_due_at}. Your seven days start only after approval.`)
  if (job.kind === "approved" && job.payload.ends_at) lines.push(`Featured placement ends: ${job.payload.ends_at}`)
  if (job.kind === "rejected") lines.push("A full refund has been requested. We will notify you when Stripe confirms it.")
  if (job.kind === "refunded") lines.push("Stripe confirmed the full refund. Your bank may take several days to display it.")
  if (job.kind === "refund_failed") lines.push("Open the admin queue and check Stripe before retrying the full refund. Automatic retries are limited.")
  lines.push(`${baseUrl}${job.audience === "admin" ? "/admin/promotions" : "/my-ads/featured"}`)
  return { subject: title[job.kind] ?? "Featured request update", text: lines.join("\n\n") }
}

export function promotionReviewOverdue(promotion: Pick<Promotion, "status" | "review_due_at">, now = Date.now()): boolean {
  return promotion.status === "pending" && Date.parse(promotion.review_due_at ?? "") <= now
}
