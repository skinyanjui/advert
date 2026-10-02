import "server-only"
import { boardDb } from "@/lib/board-db"
import { sendEmail } from "@/lib/email"
import { featuredPackage } from "@/lib/promotions"
import { promotionNotificationMessage, type PromotionNotification } from "@/lib/promotion-notifications"
import { finishPromotionRefund, promotionRpc } from "@/lib/promotion-store"
import { checkoutBaseUrl } from "@/lib/stripe"

export async function runPromotionOperations() {
  await promotionRpc("sweep_board_promotion_operations")
  const db = boardDb()
  const { data: refunds, error } = await db.from("board_promotions").select("id")
    .eq("status", "refund_pending").lt("refund_attempts", featuredPackage.maxRefundAttempts)
    .or(`refund_next_attempt_at.is.null,refund_next_attempt_at.lte.${new Date().toISOString()}`)
    .order("created_at").limit(5)
  if (error) throw new Error(error.message)
  const refundResults = await Promise.allSettled((refunds ?? []).map(row => finishPromotionRefund(row.id)))
  const notices = await promotionRpc<PromotionNotification[]>("claim_board_promotion_notifications", { p_limit: 10 })
  let delivered = 0
  let failed = 0
  // Only a real configured provider can acknowledge a durable notification.
  await Promise.all(notices.map(async job => {
    let reason = "Email delivery is not configured."
    let sent = false
    try {
      let recipient = process.env.PROMOTION_ALERT_EMAIL?.trim() || process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim()
      if (job.audience === "seller") {
        const { data, error: userError } = await db.auth.admin.getUserById(job.owner_id)
        if (userError) throw new Error("Account email is unavailable.")
        recipient = data.user?.email_confirmed_at ? data.user.email : undefined
      }
      if (!recipient) reason = "Verified notification recipient is unavailable."
      else if (process.env.RESEND_API_KEY?.trim() && process.env.RESEND_FROM_EMAIL?.trim()) {
        const result = await sendEmail({ to: recipient, ...promotionNotificationMessage(job, checkoutBaseUrl()), idempotencyKey: `promotion-notice-${job.id}` })
        sent = result.ok && result.provider === "resend"
        reason = "The email provider did not confirm delivery."
      }
    } catch { reason = "Notification could not be delivered. Check email configuration and the recipient." }
    await promotionRpc("complete_board_promotion_notification", { p_id: job.id, p_lease: job.lease, p_delivered: sent, p_error: sent ? null : reason })
    if (sent) delivered += 1
    else failed += 1
  }))
  return { refundsAttempted: refundResults.length, refundFailures: refundResults.filter(result => result.status === "rejected").length, notificationsDelivered: delivered, notificationsDeferred: failed }
}
