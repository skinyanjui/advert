import { NextResponse } from "next/server"

import { boardDb } from "@/lib/board-db"
import { canOwner } from "@/lib/access-control"
import { resolveMutationOwner } from "@/lib/board-session"
import { contactEventSchema, readApiInput } from "@/lib/runtime-contracts"
import { requireCurrentTerms } from "@/lib/terms-gate"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: Request) {
  const owner = await resolveMutationOwner(request)
  if (!owner) return new NextResponse(null, { status: 204 })

  try {
    const parsed = await readApiInput(request, contactEventSchema)
    if (!parsed.ok) return new NextResponse(null, { status: 204 })
    const body = parsed.value
    if (body.eventType !== "listing_view") {
      const permission = body.eventType === "message_start" ? "message" : "contact:direct"
      if (owner.kind !== "auth" || !canOwner(owner, permission) || await requireCurrentTerms(owner.id)) return new NextResponse(null, { status: 204 })
    }
    const { error } = await boardDb().rpc("record_board_contact_event", {
      p_listing: body.listingId,
      p_actor: owner.id,
      p_kind: owner.kind,
      p_event: body.eventType,
    })

    if (error) {
      // Analytics is non-critical. Keep contact actions working if the migration
      // has not been applied yet or the database is temporarily unavailable.
      console.error("Could not record contact event", error.message)
    }
  } catch {
    // Ignore malformed or failed analytics requests.
  }

  return new NextResponse(null, { status: 204 })
}
