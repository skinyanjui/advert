import { NextResponse } from "next/server"

import { fail, ok } from "@/lib/api"
import { resolveMutationOwner, resolveOwner } from "@/lib/board-session"
import { deleteAccount, getProfile, updateProfile } from "@/lib/profile-store"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: Request) {
  const owner = await resolveOwner(request)
  if (!owner || owner.kind !== "auth") {
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
  if (!owner || owner.kind !== "auth") {
    return fail("Sign in to update your profile.", 401)
  }
  try {
    const body = (await request.json()) as Record<string, unknown>
    const input = {
      ...(Object.prototype.hasOwnProperty.call(body, "displayName")
        ? { displayName: typeof body.displayName === "string" || body.displayName === null ? body.displayName : undefined }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(body, "city")
        ? { city: typeof body.city === "string" || body.city === null ? body.city : undefined }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(body, "countryCode")
        ? {
            countryCode:
              typeof body.countryCode === "string" || body.countryCode === null ? body.countryCode : undefined,
          }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(body, "avatarUrl")
        ? { avatarUrl: typeof body.avatarUrl === "string" || body.avatarUrl === null ? body.avatarUrl : undefined }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(body, "phone")
        ? { phone: typeof body.phone === "string" || body.phone === null ? body.phone : undefined }
        : {}),
    }
    const result = await updateProfile(owner.id, input, owner.email)
    if (!result.ok) return fail(result.reason)
    return ok({ profile: result.value })
  } catch {
    return fail("Could not save your profile.", 500)
  }
}

export async function DELETE(request: Request) {
  const owner = await resolveMutationOwner(request)
  if (!owner || owner.kind !== "auth") {
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
