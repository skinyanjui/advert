import { canOwner } from "@/lib/access-control"
import { fail, ok } from "@/lib/api"
import { resolveMutationOwner } from "@/lib/board-session"
import { createMessage, markMessagesRead, replyToConversation } from "@/lib/board-store"
import { requireCurrentTerms } from "@/lib/terms-gate"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: Request) {
  const owner = await resolveMutationOwner(request)
  if (!canOwner(owner, "message") || !owner || owner.kind !== "auth") {
    return fail("Sign in to send a message.", 401)
  }
  try {
    const termsBlock = await requireCurrentTerms(owner.id)
    if (termsBlock) return termsBlock
    const body = (await request.json()) as {
      listingId?: unknown
      conversationId?: unknown
      body?: unknown
    }
    const text = typeof body.body === "string" ? body.body : ""
    const conversationId = typeof body.conversationId === "string" ? body.conversationId : ""
    const listingId = typeof body.listingId === "string" ? body.listingId : ""
    const result = conversationId
      ? await replyToConversation(owner.id, conversationId, text)
      : await createMessage(owner.id, listingId, text)
    if (!result.ok) return fail(result.reason)
    return ok({ messages: result.value })
  } catch {
    return fail("The board database did not respond.", 500)
  }
}

export async function PATCH(request: Request) {
  const owner = await resolveMutationOwner(request)
  if (!canOwner(owner, "message") || !owner || owner.kind !== "auth") {
    return fail("Sign in to update messages.", 401)
  }
  try {
    const body = (await request.json()) as { conversationId?: unknown; listingId?: unknown }
    const conversationId = typeof body.conversationId === "string" ? body.conversationId : ""
    if (!conversationId) return fail("Choose a conversation.")
    const result = await markMessagesRead(owner.id, conversationId)
    if (!result.ok) return fail(result.reason)
    return ok({ messages: result.value })
  } catch {
    return fail("The board database did not respond.", 500)
  }
}
