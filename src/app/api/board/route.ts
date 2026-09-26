import { NextResponse } from "next/server"
import { fail, ok } from "@/lib/api"
import { mutationOwner, newSession, sessionOwner } from "@/lib/board-session"
import { importBoard, listBoard } from "@/lib/board-store"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: Request) {
  try {
    const owner = sessionOwner(request)
    if (owner) return NextResponse.json(await listBoard(owner))
    const response = NextResponse.json({ posted: [], savedIds: [], messages: [] })
    const id = newSession(response)
    const state = await listBoard(id)
    // Set-Cookie stays on the response used for the first board load.
    return NextResponse.json(state, { headers: response.headers })
  } catch {
    return fail("The board database did not respond.", 500)
  }
}

export async function POST(request: Request) {
  const owner = mutationOwner(request)
  if (!owner) return fail("A valid browser session is required.", 403)
  try {
    const body: unknown = await request.json()
    return ok(await importBoard(owner, body))
  } catch {
    return fail("The board database did not respond.", 500)
  }
}
