import "server-only"

import { boardDb } from "@/lib/board-db"
import { cleanListing } from "@/lib/board-payload"
import {
  normalizeProfileUpdate,
  type BoardProfile,
  type ProfileUpdateInput,
} from "@/lib/profile"
import type { Listing } from "@/lib/types"

type Result<T> = { ok: true; value: T } | { ok: false; reason: string }

function check(error: { message: string } | null) {
  if (error) throw new Error(error.message)
}

type ProfileRow = {
  user_id: string
  email: string | null
  display_name: string | null
  avatar_url?: string | null
  city?: string | null
  country_code?: string | null
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
    createdAt: typeof row.created_at === "string" ? row.created_at : null,
  }
}

function avatarPath(image: string) {
  const base = `${process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatars/`
  const path = image.startsWith(base) ? image.slice(base.length) : ""
  return /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(path) ? path : undefined
}

function listingPhotoPath(image: string) {
  const base = `${process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listing-photos/`
  const path = image.startsWith(base) ? image.slice(base.length) : ""
  return /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(path) ? path : undefined
}

async function removeAvatar(image: string | null | undefined) {
  if (!image) return
  const path = avatarPath(image)
  if (!path) return
  const { error } = await boardDb().storage.from("avatars").remove([path])
  if (error) console.error("Could not remove avatar", error)
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

/** Ensure a profile row exists for the signed-in user without wiping display_name. */
export async function ensureProfile(
  userId: string,
  email?: string | null,
): Promise<BoardProfile> {
  const db = boardDb()
  const { data: existing, error: readError } = await db
    .from("board_profiles")
    .select("user_id,email,display_name,avatar_url,city,country_code,created_at")
    .eq("user_id", userId)
    .maybeSingle()
  check(readError)
  if (existing) {
    if (email && existing.email !== email) {
      const { data, error } = await db
        .from("board_profiles")
        .update({ email, updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .select("user_id,email,display_name,avatar_url,city,country_code,created_at")
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
    .select("user_id,email,display_name,avatar_url,city,country_code,created_at")
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
  let avatarUrl = current.avatarUrl

  if (typeof input.avatarUrl === "string" && input.avatarUrl.startsWith("data:")) {
    const stored = await storeAvatar(input.avatarUrl, userId, current.avatarUrl)
    if (!stored.ok) return stored
    avatarUrl = stored.value
  } else if (input.avatarUrl === null) {
    await removeAvatar(current.avatarUrl)
    avatarUrl = null
  } else if (typeof input.avatarUrl === "string") {
    avatarUrl = input.avatarUrl
  }

  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (input.displayName !== undefined) patch.display_name = normalized.value.displayName
  if (input.city !== undefined) patch.city = normalized.value.city
  if (input.countryCode !== undefined) patch.country_code = normalized.value.countryCode
  if (input.avatarUrl !== undefined) patch.avatar_url = avatarUrl
  if (email) patch.email = email

  const db = boardDb()
  const { data, error } = await db
    .from("board_profiles")
    .update(patch)
    .eq("user_id", userId)
    .select("user_id,email,display_name,avatar_url,city,country_code,created_at")
    .single()
  check(error)
  return { ok: true, value: unpackProfile(data as ProfileRow) }
}

async function removeListingPhotos(listing: Listing) {
  const images =
    Array.isArray(listing.images) && listing.images.length > 0
      ? listing.images
      : listing.image
        ? [listing.image]
        : []
  const db = boardDb()
  for (const image of images) {
    const path = listingPhotoPath(image)
    if (!path) continue
    const { error } = await db.storage.from("listing-photos").remove([path])
    if (error) console.error("Could not remove listing photo", error)
  }
}

/**
 * Delete the account and owned board data.
 * Listings/saves/messages have no FK to auth.users, so they are removed explicitly.
 * Conversation messages cascade when their conversation row is deleted.
 * board_profiles and board_session_claims cascade from auth.users.
 */
export async function deleteAccount(userId: string): Promise<Result<true>> {
  const db = boardDb()

  const { data: listings, error: listingsError } = await db
    .from("board_listings")
    .select("id,payload")
    .eq("owner_id", userId)
  check(listingsError)

  for (const row of listings ?? []) {
    const listing = cleanListing(row.payload)
    if (listing) await removeListingPhotos(listing)
    const { error: saveError } = await db.from("board_saves").delete().eq("listing_id", row.id)
    check(saveError)
  }

  const { error: deleteListingsError } = await db.from("board_listings").delete().eq("owner_id", userId)
  check(deleteListingsError)

  const { error: savesError } = await db.from("board_saves").delete().eq("owner_id", userId)
  check(savesError)

  const { error: legacyMessagesError } = await db.from("board_messages").delete().eq("owner_id", userId)
  check(legacyMessagesError)

  // Conversations where the user is buyer or seller; messages cascade.
  const { data: conversations, error: conversationsError } = await db
    .from("board_conversations")
    .select("id")
    .or(`buyer_id.eq.${userId},listing_owner_id.eq.${userId}`)
  check(conversationsError)
  const conversationIds = (conversations ?? []).map((row) => row.id as string)
  if (conversationIds.length > 0) {
    const { error: deleteConversationsError } = await db
      .from("board_conversations")
      .delete()
      .in("id", conversationIds)
    check(deleteConversationsError)
  }

  const profile = await ensureProfile(userId)
  await removeAvatar(profile.avatarUrl)

  const { error: profileError } = await db.from("board_profiles").delete().eq("user_id", userId)
  check(profileError)

  const { error: claimsError } = await db.from("board_session_claims").delete().eq("user_id", userId)
  check(claimsError)

  const { error: authError } = await db.auth.admin.deleteUser(userId)
  if (authError) return { ok: false, reason: authError.message }

  return { ok: true, value: true }
}
