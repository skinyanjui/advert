import "server-only"
import { after } from "next/server"
import { runPromotionOperations } from "@/lib/promotion-operations"

/** Durable jobs remain queued if the response lifecycle cannot finish delivery. */
export function schedulePromotionOperations() {
  after(async () => {
    try { await runPromotionOperations() }
    catch { console.error("Promotion background delivery deferred to the scheduled retry.") }
  })
}
