import { promotionEventSchema, readApiInput } from "@/lib/runtime-contracts"
import { createHmac } from "node:crypto"
import { fail, ok } from "@/lib/api"
import { resolveMutationOwner } from "@/lib/board-session"
import { promotionRpc } from "@/lib/promotion-store"

export const runtime = "nodejs"
export async function POST(request: Request) {
  const owner = await resolveMutationOwner(request)
  if (!owner) return fail("Same-origin board session required.", 401)
  try {
    const parsed = await readApiInput(request, promotionEventSchema)
    if (!parsed.ok) return fail(parsed.reason)
    const body = parsed.value
    const secret = process.env.BOARD_SESSION_SECRET ?? process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!secret) return fail("Tracking unavailable.", 503)
    const day = new Date().toISOString().slice(0, 10)
    const hash = createHmac("sha256", secret).update(`promotion:${day}:${owner.id}`).digest("hex")
    await promotionRpc("record_board_promotion_event", { p_id: body.promotionId, p_event: body.type, p_actor: owner.id, p_hash: hash })
    return ok({ recorded: true })
  } catch { return fail("Tracking unavailable.", 503) }
}
