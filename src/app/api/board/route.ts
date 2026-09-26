import { fail, ok, ownerToken, requireOwner } from "@/lib/api"
import { importBoard, listBoard } from "@/lib/board-store"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: Request) {
  try {
    return Response.json(listBoard(ownerToken(request)))
  } catch {
    return fail("The board database did not respond.", 500)
  }
}

export async function POST(request: Request) {
  const owner = requireOwner(request)
  if (!owner.ok) return owner.response
  try {
    const body: unknown = await request.json()
    return ok(importBoard(owner.token, body))
  } catch {
    return fail("The board database did not respond.", 500)
  }
}
