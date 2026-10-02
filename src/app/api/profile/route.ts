import { NextResponse } from "next/server"\n
import { canOwner } from "@/lib/access-control"
import { fail, ok } from "@/lib/api"
import { resolveMutationOwner, resolveOwner } from "@/lib/board-session"
import { deleteAccount, getProfile, updateProfile } from "@/lib/profile-store"
import { profilePatchSchema, accountDeletionSchema, readApiInput } from "@/lib/runtime-contracts"

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
    const parsed = await readApiInput(request, profilePatchSchema)
    if (!parsed.ok) return fail(parsed.reason)
    const input = parsed.value
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
    const parsed = await readApiInput(request, accountDeletionSchema)
    if (!parsed.ok) return fail(parsed.reason)
    const result = await deleteAccount(owner.id)
    if (!result.ok) return fail(result.reason, 500)
    const completed = result.value.completed
    return NextResponse.json(
      {
        ok: true,
        deletionRequested: true,
        deleted: completed,
        reason: completed
          ? "Account deletion completed."
          : "Account deletion is in progress. Account access is locked while cleanup retries automatically.",
      },
      { status: completed ? 200 : 202 },
    )
  } catch {
    return fail("Could not delete your account.", 500)
  }
}
