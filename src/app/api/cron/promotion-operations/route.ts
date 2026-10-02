import { fail, ok } from "@/lib/api"
import { retryDueAccountDeletions } from "@/lib/account-deletion"
import { runPromotionOperations } from "@/lib/promotion-operations"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 60

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return fail("Unauthorized", 401)
  try {
    const [promotions, accountDeletions] = await Promise.allSettled([
      runPromotionOperations(),
      retryDueAccountDeletions(),
    ])
    if (promotions.status === "rejected" && accountDeletions.status === "rejected") {
      return fail("Scheduled operations failed. Check database migrations and provider configuration.", 503)
    }
    return ok({
      promotions: promotions.status === "fulfilled" ? promotions.value : { error: "Promotion operations failed." },
      accountDeletions: accountDeletions.status === "fulfilled" ? accountDeletions.value : { error: "Account deletion retry failed." },
    })
  } catch {
    return fail("Scheduled operations failed.", 503)
  }
}
