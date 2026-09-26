import { fail, ok } from "@/lib/api"
import { mutationOwner } from "@/lib/board-session"
import { createMessage, markMessagesRead } from "@/lib/board-store"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: Request) {
  const owner = mutationOwner(request)
  if (!owner) return fail("A valid browser session is required.", 403)
  try {
    const body = (await request.json()) as { listingId?: unknown; body?: unknown }
    const listingId = typeof body.listingId === "string" ? body.listingId : ""
    const text = typeof body.body === "string" ? body.body : ""
    const result = await createMessage(owner, listingId, text)
    if (!result.ok) return fail(result.reason)
    return ok({ messages: result.value })
  } catch {
    return fail("The board database did not respond.", 500)
  }
}

export async function PATCH(request: Request) {
  const owner = mutationOwner(request)
  if (!owner) return fail("A valid browser session is required.", 403)
  try {
    const body = (await request.json()) as { listingId?: unknown }
    const listingId = typeof body.listingId === "string" ? body.listingId : ""
    const result = await markMessagesRead(owner, listingId)
    if (!result.ok) return fail(result.reason)
    return ok({ messages: result.value })
  } catch {
    return fail("The board database did not respond.", 500)
  }
}
