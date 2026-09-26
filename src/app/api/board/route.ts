import { NextResponse } from "next/server"
import { fail, ok } from "@/lib/api"
import { newSession, resolveMutationOwner, resolveOwner } from "@/lib/board-session"
import { importBoard, listBoard } from "@/lib/board-store"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: Request) {
  try {
    const owner = await resolveOwner(request)
    if (owner) {
      const state = await listBoard(owner.id)
      return NextResponse.json({ ...state, auth: owner.kind === "auth", email: owner.email ?? null })
    }
    const response = NextResponse.json({ posted: [], savedIds: [], messages: [], auth: false, email: null })
    const id = newSession(response)
    const state = await listBoard(id)
    return NextResponse.json({ ...state, auth: false, email: null }, { headers: response.headers })
  } catch {
    return fail("The board database did not respond.", 500)
  }
}

export async function POST(request: Request) {
  const owner = await resolveMutationOwner(request)
  if (!owner) return fail("A valid browser session is required.", 403)
  try {
    const body: unknown = await request.json()
    return ok(await importBoard(owner.id, body))
  } catch {
    return fail("The board database did not respond.", 500)
  }
}
