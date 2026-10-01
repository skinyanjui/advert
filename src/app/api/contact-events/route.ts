import { NextResponse } from "next/server"

import { boardDb } from "@/lib/board-db"
import { resolveMutationOwner } from "@/lib/board-session"
import { contactEventSchema, readApiInput } from "@/lib/runtime-contracts"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: Request) {
  const owner = await resolveMutationOwner(request)
  if (!owner) return new NextResponse(null, { status: 204 })

  try {
    const parsed = await readApiInput(request, contactEventSchema)
    if (!parsed.ok) return new NextResponse(null, { status: 204 })
    const body = parsed.value

    const { error } = await boardDb().from("board_contact_events").insert({
      id: crypto.randomUUID(),
      listing_id: body.listingId,
      actor_id: owner.id,
      actor_kind: owner.kind,
      event_type: body.eventType,
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
