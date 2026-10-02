import "server-only"
import { paidFeaturingConfigured } from "@/lib/stripe"
import { paymentSupportStatus } from "@/lib/payment-support"
import { promotionOperationsReady } from "@/lib/promotion-store"

/** A configuration flag cannot substitute for actual receipt at the support inbox. */
export async function paidCheckoutReady(): Promise<boolean> {
  if (!paidFeaturingConfigured() || !process.env.CRON_SECRET?.trim()) return false
  try {
    const [support, operationsReady] = await Promise.all([paymentSupportStatus(), promotionOperationsReady()])
    return support.verified && support.deliveryConfigured && operationsReady
  } catch { return false }
}
