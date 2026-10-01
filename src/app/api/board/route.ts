import { boardImportSchema, readApiInput } from "@/lib/runtime-contracts"
import { NextResponse } from "next/server"
import { fail, ok } from "@/lib/api"
import { canOwner } from "@/lib/access-control"
import { newSession, resolveMutationOwner, resolveOwner } from "@/lib/board-session"
import { importBoard, listBoard } from "@/lib/board-store"
import { getTermsStatus, requireCurrentTerms } from "@/lib/terms-gate"

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
        admin: canOwner(owner, "admin:access"),
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
  if (!canOwner(owner, "profile") || !owner || owner.kind !== "auth") {
    return fail("Sign in to import account data.", 401)
  }
  const termsBlock = await requireCurrentTerms(owner.id)
  if (termsBlock) return termsBlock
  try {
    const parsed = await readApiInput(request, boardImportSchema)
    if (!parsed.ok) return fail(parsed.reason)
    return ok(await importBoard(owner.id, parsed.value))
  } catch {
    return fail("The board database did not respond.", 500)
  }
}
