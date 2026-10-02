import "server-only"
import { readSellerProfileRows } from "@/lib/board-inventory"

import { requestAccountDeletion, type AccountDeletionResult } from "@/lib/account-deletion"
import { boardDb } from "@/lib/board-db"
import {
  acceptAvatarUrlUpdate,
  normalizeProfileUpdate,
  type BoardProfile,
  type ProfileUpdateInput,
} from "@/lib/profile"
import type { Listing } from "@/lib/types"

type Result<T> = { ok: true; value: T } | { ok: false; reason: string }

export type DeleteAccountResult = AccountDeletionResult

export type ProfilePublic = {
  displayName: string | null
  avatarUrl: string | null
  createdAt: string | null
}

function check(error: { message: string } | null) {
  if (error) throw new Error(error.message)
}

const profileSelect =
  "user_id,email,display_name,avatar_url,city,country_code,phone,language,currency,created_at"

type ProfileRow = {
  user_id: string
  email: string | null
  display_name: string | null
  avatar_url?: string | null
  city?: string | null
  country_code?: string | null
  phone?: string | null
  language?: string | null
  currency?: string | null
  created_at: string | null
}

function unpackProfile(row: ProfileRow): BoardProfile {
  return {
    userId: row.user_id,
    email: typeof row.email === "string" ? row.email : null,
    displayName: typeof row.display_name === "string" ? row.display_name : null,
    avatarUrl: typeof row.avatar_url === "string" ? row.avatar_url : null,
    city: typeof row.city === "string" ? row.city : null,
    countryCode: typeof row.country_code === "string" ? row.country_code : null,
    phone: typeof row.phone === "string" ? row.phone : null,
    language: typeof row.language === "string" ? row.language : null,
    currency: typeof row.currency === "string" ? row.currency : null,
    createdAt: typeof row.created_at === "string" ? row.created_at : null,
  }
}

function avatarStoragePath(image: string) {
  const marker = "/storage/v1/object/public/avatars/"
  const index = image.indexOf(marker)
  if (index < 0) return undefined
  const path = image.slice(index + marker.length)
  return /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(path) ? path : undefined
}

async function removeAvatar(image: string | null | undefined): Promise<string | null> {
  if (!image) return null
  const path = avatarStoragePath(image)
  if (!path) return null
  const { error } = await boardDb().storage.from("avatars").remove([path])
  if (error) {
    console.error("Could not remove avatar", error)
    return error.message
  }
  return null
}

async function storeAvatar(image: string, owner: string, previous?: string | null): Promise<Result<string>> {
  if (image === previous) return { ok: true, value: image }
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(image)
  if (!match) return { ok: false, reason: "Upload a JPEG, PNG, or WebP photo." }
  const bytes = Buffer.from(match[2], "base64")
  if (!bytes.length || bytes.length > 1_500_000) return { ok: false, reason: "The photo is too large." }
  const mime = match[1]
  const valid =
    mime === "image/jpeg"
      ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
      : mime === "image/png"
        ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        : bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP"
  if (!valid) return { ok: false, reason: "The photo file is invalid." }
  const path = `${owner}/${crypto.randomUUID()}.${mime === "image/jpeg" ? "jpg" : mime === "image/png" ? "png" : "webp"}`
  const db = boardDb()
  const { error } = await db.storage.from("avatars").upload(path, bytes, { contentType: mime, upsert: true })
  check(error)
  if (previous && previous !== image) await removeAvatar(previous)
  return { ok: true, value: db.storage.from("avatars").getPublicUrl(path).data.publicUrl }
}

export async function profilesByUserIds(userIds: string[]): Promise<Map<string, ProfilePublic>> {
  const unique = [...new Set(userIds.filter(Boolean))]
  const map = new Map<string, ProfilePublic>()
  if (unique.length === 0) return map
  const rows = await readSellerProfileRows(boardDb(), unique)
  for (const row of rows) {
    map.set(row.user_id, {
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      createdAt: row.created_at,
    })
  }
  return map
}

export function applySellerProfile(listing: Listing, profile: ProfilePublic | undefined): Listing {
  if (!profile) return listing
  const displayName = profile.displayName?.trim()
  const year = profile.createdAt ? new Date(profile.createdAt).getFullYear() : NaN
  return {
    ...listing,
    sellerName: displayName || listing.sellerName,
    sellerAvatar: profile.avatarUrl || listing.sellerAvatar,
    sellerSince: Number.isFinite(year) ? String(year) : listing.sellerSince,
  }
}

/** Ensure a profile row exists for the signed-in user without wiping display_name. */
export async function ensureProfile(
  userId: string,
  email?: string | null,
): Promise<BoardProfile> {
  const db = boardDb()
  const { data: existing, error: readError } = await db
    .from("board_profiles")
    .select(profileSelect)
    .eq("user_id", userId)
    .maybeSingle()
  check(readError)
  if (existing) {
    if (email && existing.email !== email) {
      const { data, error } = await db
        .from("board_profiles")
        .update({ email, updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .select(profileSelect)
        .single()
      check(error)
      return unpackProfile(data as ProfileRow)
    }
    return unpackProfile(existing as ProfileRow)
  }

  const { data, error } = await db
    .from("board_profiles")
    .insert({
      user_id: userId,
      email: email ?? null,
      display_name: email?.includes("@") ? email.split("@")[0] ?? null : null,
      updated_at: new Date().toISOString(),
    })
    .select(profileSelect)
    .single()
  check(error)
  return unpackProfile(data as ProfileRow)
}

export async function getProfile(userId: string, email?: string | null): Promise<BoardProfile> {
  return ensureProfile(userId, email)
}

export async function updateProfile(
  userId: string,
  input: ProfileUpdateInput,
  email?: string | null,
): Promise<Result<BoardProfile>> {
  const normalized = normalizeProfileUpdate(input)
  if (!normalized.ok) return normalized

  const current = await ensureProfile(userId, email)
  const avatarDecision = acceptAvatarUrlUpdate(input.avatarUrl, current.avatarUrl, userId)
  if (!avatarDecision.ok) return avatarDecision

  let avatarUrl = current.avatarUrl
  if (avatarDecision.kind === "data" && avatarDecision.value) {
    const stored = await storeAvatar(avatarDecision.value, userId, current.avatarUrl)
    if (!stored.ok) return stored
    avatarUrl = stored.value
  } else if (avatarDecision.kind === "clear") {
    await removeAvatar(current.avatarUrl)
    avatarUrl = null
  } else if (avatarDecision.kind === "keep") {
    avatarUrl = current.avatarUrl
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (input.displayName !== undefined) patch.display_name = normalized.value.displayName
  if (input.city !== undefined) patch.city = normalized.value.city
  if (input.countryCode !== undefined) patch.country_code = normalized.value.countryCode
  if (input.avatarUrl !== undefined) patch.avatar_url = avatarUrl
  if (input.phone !== undefined) patch.phone = normalized.value.phone ?? null
  if (input.language !== undefined) patch.language = normalized.value.language ?? null
  if (input.currency !== undefined) patch.currency = normalized.value.currency ?? null
  if (email) patch.email = email

  const db = boardDb()
  const { data, error } = await db
    .from("board_profiles")
    .update(patch)
    .eq("user_id", userId)
    .select(profileSelect)
    .single()
  check(error)
  const profile = unpackProfile(data as ProfileRow)

  if (input.displayName !== undefined && profile.displayName) {
    const { error: conversationError } = await db
      .from("board_conversations")
      .update({ seller_name: profile.displayName })
      .eq("listing_owner_id", userId)
    check(conversationError)
  }

  return { ok: true, value: profile }
}

/** Durable, idempotent account deletion. Auth removal is the final cleanup step. */
export async function deleteAccount(userId: string): Promise<DeleteAccountResult> {
  return requestAccountDeletion(userId)
}
