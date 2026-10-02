import { fail, ok } from "@/lib/api"
import { runPromotionOperations } from "@/lib/promotion-operations"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 60

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return fail("Unauthorized", 401)
  try { return ok(await runPromotionOperations()) }
  catch { return fail("Promotion operations failed. Check database migration and provider configuration.", 503) }
}
