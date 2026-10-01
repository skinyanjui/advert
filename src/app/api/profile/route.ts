import { NextResponse } from "next/server"

import { canOwner } from "@/lib/access-control"
import { fail, ok } from "@/lib/api"
import { resolveMutationOwner, resolveOwner } from "@/lib/board-session"
import { deleteAccount, getProfile, updateProfile } from "@/lib/profile-store"
import { profilePatchFromUnknown } from "@/lib/runtime-contracts"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: Request) {
  const owner = await resolveOwner(request)
  if (!canOwner(owner, "profile") || !owner || owner.kind !== "auth") {
    return fail("Sign in to view your profile.", 401)
  }
  try {
    const profile = await getProfile(owner.id, owner.email)
    return ok({ profile })
  } catch {
    return fail("Could not load your profile.", 500)
  }
}

export async function PATCH(request: Request) {
  const owner = await resolveMutationOwner(request)
  if (!canOwner(owner, "profile") || !owner || owner.kind !== "auth") {
    return fail("Sign in to update your profile.", 401)
  }
  try {
    const input = profilePatchFromUnknown(await request.json())
    const result = await updateProfile(owner.id, input, owner.email)
    if (!result.ok) return fail(result.reason)
    return ok({ profile: result.value })
  } catch {
    return fail("Could not save your profile.", 500)
  }
}

export async function DELETE(request: Request) {
  const owner = await resolveMutationOwner(request)
  if (!canOwner(owner, "profile") || !owner || owner.kind !== "auth") {
    return fail("Sign in to delete your account.", 401)
  }
  try {
    const body = (await request.json().catch(() => ({}))) as { confirm?: unknown }
    if (body.confirm !== "DELETE") {
      return fail('Type DELETE to confirm account deletion.')
    }
    const result = await deleteAccount(owner.id)
    if (!result.ok) {
      if (result.authDeleted) {
        return NextResponse.json(
          { ok: false, authDeleted: true, reason: result.reason },
          { status: 500 },
        )
      }
      return fail(result.reason, 500)
    }
    return ok({ deleted: true })
  } catch {
    return fail("Could not delete your account.", 500)
  }
}
