import { fail, ok } from "@/lib/api"
import { getFxRates } from "@/lib/fx-server"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  try {
    const rates = await getFxRates()
    if (!rates) return fail("Exchange rates unavailable.", 503)
    return ok({ rates })
  } catch {
    return fail("Exchange rates unavailable.", 503)
  }
}
