import { fail, ok, requireOwner } from "@/lib/api"
import { createMessage, markMessagesRead } from "@/lib/board-store"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: Request) {
  const owner = requireOwner(request)
  if (!owner.ok) return owner.response
  try {
    const body = (await request.json()) as { listingId?: unknown; body?: unknown }
    const listingId = typeof body.listingId === "string" ? body.listingId : ""
    const text = typeof body.body === "string" ? body.body : ""
    const result = createMessage(owner.token, listingId, text)
    if (!result.ok) return fail(result.reason)
    return ok({ messages: result.value })
  } catch {
    return fail("The board database did not respond.", 500)
  }
}

export async function PATCH(request: Request) {
  const owner = requireOwner(request)
  if (!owner.ok) return owner.response
  try {
    const body = (await request.json()) as { listingId?: unknown }
    const listingId = typeof body.listingId === "string" ? body.listingId : ""
    const result = markMessagesRead(owner.token, listingId)
    if (!result.ok) return fail(result.reason)
    return ok({ messages: result.value })
  } catch {
    return fail("The board database did not respond.", 500)
  }
}
