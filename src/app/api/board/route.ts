import { NextResponse } from "next/server"
import { fail, ok } from "@/lib/api"
import { isAdminEmail } from "@/lib/admin"
import { canOwner } from "@/lib/access-control"
import { newSession, resolveMutationOwner, resolveOwner } from "@/lib/board-session"
import { importBoard, listBoard } from "@/lib/board-store"
import { getTermsStatus } from "@/lib/terms-gate"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: Request) {
  try {
    const owner = await resolveOwner(request)
    if (owner) {
      const state = await listBoard(owner.id)
      const terms = owner.kind === "auth" ? await getTermsStatus(owner.id) : null
      const privateAccess = canOwner(owner, "profile") && (terms?.current ?? false)
      const posted = privateAccess
        ? state.posted
        : state.posted.map((listing) => ({
            ...listing,
            phone: "",
            contactPhone: false,
            contactWhatsApp: false,
          }))
      return NextResponse.json({
        ...state,
        posted,
        savedIds: privateAccess ? state.savedIds : [],
        messages: privateAccess ? state.messages : [],
        auth: owner.kind === "auth",
        email: owner.email ?? null,
        admin: owner.kind === "auth" && isAdminEmail(owner.email),
      })
    }
    const response = NextResponse.json({
      posted: [],
      savedIds: [],
      messages: [],
      auth: false,
      email: null,
      admin: false,
    })
    const id = newSession(response)
    const state = await listBoard(id)
    const posted = state.posted.map((listing) => ({
      ...listing,
      phone: "",
      contactPhone: false,
      contactWhatsApp: false,
    }))
    return NextResponse.json(
      { ...state, posted, savedIds: [], messages: [], auth: false, email: null, admin: false },
      { headers: response.headers },
    )
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
