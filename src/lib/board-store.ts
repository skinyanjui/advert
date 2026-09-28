import "server-only"

import { boardDb } from "@/lib/board-db"
import { seedListings } from "@/lib/catalog"
import { hoursAgoOf } from "@/lib/format"
import { acceptListing } from "@/lib/listing-rules"
import { messageError, type BoardMessage } from "@/lib/messages"
import { cleanListing, parseBoardState, type BoardState } from "@/lib/board-payload"
import {
  isReportReasonId,
  reportAutoHideThreshold,
  reportNoteError,
  type ReportReasonId,
} from "@/lib/reports"
import { expiresAtFrom, expiryNoticeDays, isListingExpired } from "@/lib/expiry"
import { sendEmail } from "@/lib/email"
import { applySellerProfile, profilesByUserIds } from "@/lib/profile-store"
import type { Listing } from "@/lib/types"

type Result<T> = { ok: true; value: T } | { ok: false; reason: string }
type Row = {
  id: string
  owner_id: string
  posted_at: string
  payload: unknown
  hidden_at?: string | null
  hidden_reason?: string | null
  expires_at?: string | null
  expiry_reminder_sent_at?: string | null
}
const seedIds = new Set(seedListings.map((item) => item.id))
const listingIdPattern = /^ad-[a-zA-Z0-9-]{1,64}$/
function check(error: { message: string } | null) { if (error) throw new Error(error.message) }
function unpack(row: Row, owner?: string): Listing | undefined {
  const listing = cleanListing(row.payload)
  return listing && { ...listing, id: row.id, postedAt: row.posted_at,
    hoursAgo: hoursAgoOf({ hoursAgo: listing.hoursAgo, postedAt: row.posted_at }),
    mine: Boolean(owner) && owner === row.owner_id,
    featured: undefined,
    hidden: row.hidden_at ? true : undefined,
    expiresAt: row.expires_at ?? listing.expiresAt }
}
function payload(listing: Listing) {
  const images =
    Array.isArray(listing.images) && listing.images.length > 0
      ? listing.images.slice(0, 6)
      : listing.image
        ? [listing.image]
        : []
  return {
    ...listing,
    image: images[0] ?? listing.image,
    images: images.length > 0 ? images : undefined,
    mine: undefined,
    featured: undefined,
    hidden: undefined,
    expiresAt: undefined,
    sellerAvatar: undefined,
    sold: listing.sold === true ? true : undefined,
  }
}
function photoPath(image: string) {
  const base = `${process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/listing-photos/`
  const path = image.startsWith(base) ? image.slice(base.length) : ""
  return /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(path) ? path : undefined
}
async function storePhoto(image: string, owner: string, previous?: string): Promise<Result<string>> {
  if (image === previous || /^\/listings\/[\w.-]+$/.test(image)) return { ok: true, value: image }
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(image)
  if (!match) return { ok: false, reason: "Upload a JPEG, PNG, or WebP photo." }
  const bytes = Buffer.from(match[2], "base64")
  if (!bytes.length || bytes.length > 1_500_000) return { ok: false, reason: "The photo is too large." }
  const mime = match[1]
  const valid = mime === "image/jpeg" ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
    : mime === "image/png" ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP"
  if (!valid) return { ok: false, reason: "The photo file is invalid." }
  const path = `${owner}/${crypto.randomUUID()}.${mime === "image/jpeg" ? "jpg" : mime === "image/png" ? "png" : "webp"}`
  const db = boardDb()
  const { error } = await db.storage.from("listing-photos").upload(path, bytes, { contentType: mime })
  check(error)
  return { ok: true, value: db.storage.from("listing-photos").getPublicUrl(path).data.publicUrl }
}

async function storePhotos(
  images: string[],
  owner: string,
  previous: string[] = [],
): Promise<Result<string[]>> {
  if (images.length > 6) return { ok: false, reason: "You can add up to 6 photos." }
  if (images.length === 0) return { ok: false, reason: "Add at least one photo, or keep the category placeholder." }
  const stored: string[] = []
  for (let index = 0; index < images.length; index++) {
    const image = images[index]!
    const prior = previous.includes(image) ? image : undefined
    const result = await storePhoto(image, owner, prior)
    if (!result.ok) {
      for (const url of stored) {
        if (!previous.includes(url)) await removePhoto(url)
      }
      return result
    }
    stored.push(result.value)
  }
  return { ok: true, value: stored }
}

function listingPhotoList(listing: Listing): string[] {
  if (Array.isArray(listing.images) && listing.images.length > 0) return listing.images.slice(0, 6)
  return listing.image ? [listing.image] : []
}
async function removePhoto(image: string) {
  const path = photoPath(image)
  if (!path) return
  const { error } = await boardDb().storage.from("listing-photos").remove([path])
  if (error) console.error("Could not remove listing photo", error)
}
export async function listBoard(owner: string): Promise<BoardState> {
  const db = boardDb()
  const [posted, saved, messages] = await Promise.all([
    db
      .from("board_listings")
      .select("id,owner_id,posted_at,payload,hidden_at,hidden_reason,expires_at")
      .order("posted_at", { ascending: false })
      .limit(500),
    db.from("board_saves").select("listing_id").eq("owner_id", owner).order("created_at", { ascending: false }),
    listMessagesFor(owner),
  ])
  check(posted.error)
  check(saved.error)
  const ownerIds = (posted.data ?? []).map((row) => row.owner_id as string)
  const profiles = await profilesByUserIds(ownerIds)
  return {
    posted: (posted.data ?? []).flatMap((row) => {
      const item = unpack(row as Row, owner)
      if (!item) return []
      // Hidden/expired ads stay visible only to the owner (My ads / renew).
      if ((item.hidden || isListingExpired(item.expiresAt)) && !item.mine) return []
      return [applySellerProfile(item, profiles.get(row.owner_id as string))]
    }),
    savedIds: (saved.data ?? []).map((row) => row.listing_id),
    messages,
  }
}

type ConversationRow = {
  id: string
  listing_id: string
  listing_owner_id: string
  buyer_id: string
  listing_title: string
  seller_name: string
  buyer_last_read_at: string | null
  seller_last_read_at: string | null
}

type ConversationMessageRow = {
  id: string
  conversation_id: string
  sender_id: string
  body: string
  sent_at: string
}

async function listMessagesFor(viewerId: string): Promise<BoardMessage[]> {
  const db = boardDb()
  const { data: asBuyer, error: buyerError } = await db
    .from("board_conversations")
    .select("id,listing_id,listing_owner_id,buyer_id,listing_title,seller_name,buyer_last_read_at,seller_last_read_at")
    .eq("buyer_id", viewerId)
    .order("updated_at", { ascending: false })
    .limit(100)
  check(buyerError)
  const { data: asSeller, error: sellerError } = await db
    .from("board_conversations")
    .select("id,listing_id,listing_owner_id,buyer_id,listing_title,seller_name,buyer_last_read_at,seller_last_read_at")
    .eq("listing_owner_id", viewerId)
    .order("updated_at", { ascending: false })
    .limit(100)
  check(sellerError)
  const conversations = new Map<string, ConversationRow>()
  for (const row of [...(asBuyer ?? []), ...(asSeller ?? [])] as ConversationRow[]) {
    conversations.set(row.id, row)
  }
  if (conversations.size === 0) return []
  const ids = [...conversations.keys()]
  const { data: rows, error } = await db
    .from("board_conversation_messages")
    .select("id,conversation_id,sender_id,body,sent_at")
    .in("conversation_id", ids)
    .order("sent_at", { ascending: true })
    .limit(500)
  check(error)
  const profiles = await profilesByUserIds(
    [...conversations.values()].map((conversation) => conversation.listing_owner_id),
  )
  return ((rows ?? []) as ConversationMessageRow[]).flatMap((row) => {
    const conversation = conversations.get(row.conversation_id)
    if (!conversation) return []
    const profile = profiles.get(conversation.listing_owner_id)
    const sellerName = profile?.displayName?.trim() || conversation.seller_name
    return [toBoardMessage(row, conversation, viewerId, sellerName)]
  })
}

function toBoardMessage(
  row: ConversationMessageRow,
  conversation: ConversationRow,
  viewerId: string,
  sellerName: string,
): BoardMessage {
  const viewerIsSeller = conversation.listing_owner_id === viewerId
  const role = row.sender_id === conversation.listing_owner_id ? "seller" : "buyer"
  const fromMe = row.sender_id === viewerId
  const lastRead = viewerIsSeller ? conversation.seller_last_read_at : conversation.buyer_last_read_at
  const read = fromMe || (lastRead ? row.sent_at <= lastRead : false)
  return {
    id: row.id,
    conversationId: conversation.id,
    listingId: conversation.listing_id,
    listingTitle: conversation.listing_title,
    sellerName,
    peerName: viewerIsSeller ? "Buyer" : sellerName,
    body: row.body,
    sentAt: row.sent_at,
    senderId: row.sender_id,
    role,
    fromMe,
    read,
    viewerIsSeller,
  }
}
export async function createListing(owner: string, input: unknown): Promise<Result<Listing>> {
  const listing = cleanListing(input)
  if (!listing || !listingIdPattern.test(listing.id)) return { ok: false, reason: "That ad could not be read." }
  if (seedIds.has(listing.id)) return { ok: false, reason: "That listing is already on the board." }
  const accepted = acceptListing({ ...listing, mine: true, sold: undefined })
  if (!accepted.ok) return accepted
  const quota = await postingQuota(owner)
  if (!quota.ok) return quota
  const photo = await storePhotos(listingPhotoList(accepted.listing), owner)
  if (!photo.ok) return photo
  const profiles = await profilesByUserIds([owner])
  const profile = profiles.get(owner)
  const postedAt = new Date().toISOString()
  const expiresAt = expiresAtFrom(postedAt)
  const stored = {
    ...accepted.listing,
    sellerName: profile?.displayName?.trim() || accepted.listing.sellerName,
    image: photo.value[0]!,
    images: photo.value,
    postedAt,
    expiresAt,
  }
  const { error } = await boardDb().from("board_listings").insert({
    id: listing.id,
    owner_id: owner,
    posted_at: postedAt,
    expires_at: expiresAt,
    payload: payload(stored),
  })
  if (error) {
    for (const url of photo.value) {
      if (!listingPhotoList(accepted.listing).includes(url)) await removePhoto(url)
    }
    if (error.code === "23505") return { ok: false, reason: "That listing is already on the board." }
    check(error)
  }
  return { ok: true, value: applySellerProfile({ ...stored, mine: true }, profile) }
}
export async function updateListing(owner: string, id: string, input: unknown): Promise<Result<Listing>> {
  const listing = cleanListing(input)
  if (!listing || listing.id !== id || seedIds.has(id)) return { ok: false, reason: "That ad could not be read." }
  const db = boardDb()
  const { data: row, error: readError } = await db.from("board_listings").select("id,owner_id,posted_at,payload,hidden_at,hidden_reason,expires_at").eq("id", id).maybeSingle()
  check(readError)
  if (!row) return { ok: false, reason: "This ad is no longer on the board." }
  if (row.owner_id !== owner) return { ok: false, reason: "This ad is not yours." }
  const old = cleanListing(row.payload)
  const accepted = acceptListing({ ...listing, mine: true, sold: listing.sold ?? old?.sold })
  if (!accepted.ok) return accepted
  const previousPhotos = old ? listingPhotoList(old) : []
  const photo = await storePhotos(listingPhotoList(accepted.listing), owner, previousPhotos)
  if (!photo.ok) return photo
  const stored = {
    ...accepted.listing,
    id,
    image: photo.value[0]!,
    images: photo.value,
    postedAt: row.posted_at,
    hoursAgo: hoursAgoOf({ hoursAgo: 0, postedAt: row.posted_at }),
  }
  const { data, error } = await db.from("board_listings").update({ payload: payload(stored) })
    .eq("id", id).eq("owner_id", owner).select("id,owner_id,posted_at,payload,hidden_at,hidden_reason,expires_at")
  if (error || !data?.length) {
    for (const url of photo.value) {
      if (!previousPhotos.includes(url)) await removePhoto(url)
    }
    check(error)
    return { ok: false, reason: "This ad is no longer on the board." }
  }
  for (const url of previousPhotos) {
    if (!photo.value.includes(url)) await removePhoto(url)
  }
  const updated = unpack(data[0] as Row, owner)
  if (!updated) return { ok: false, reason: "That ad could not be read." }
  const profiles = await profilesByUserIds([owner])
  return { ok: true, value: applySellerProfile(updated, profiles.get(owner)) }
}

async function ownedRow(owner: string, id: string): Promise<Result<Row>> {
  if (!listingIdPattern.test(id) || seedIds.has(id)) return { ok: false, reason: "That ad could not be read." }
  const { data: row, error } = await boardDb()
    .from("board_listings")
    .select("id,owner_id,posted_at,payload,hidden_at,hidden_reason,expires_at")
    .eq("id", id)
    .maybeSingle()
  check(error)
  if (!row) return { ok: false, reason: "This ad is no longer on the board." }
  if (row.owner_id !== owner) return { ok: false, reason: "This ad is not yours." }
  return { ok: true, value: row as Row }
}

export async function setListingSold(owner: string, id: string, sold: boolean): Promise<Result<Listing>> {
  const owned = await ownedRow(owner, id)
  if (!owned.ok) return owned
  const current = cleanListing(owned.value.payload)
  if (!current) return { ok: false, reason: "That ad could not be read." }
  const stored = { ...current, id, sold: sold ? true : undefined, postedAt: owned.value.posted_at,
    hoursAgo: hoursAgoOf({ hoursAgo: 0, postedAt: owned.value.posted_at }) }
  const { data, error } = await boardDb().from("board_listings").update({ payload: payload(stored) })
    .eq("id", id).eq("owner_id", owner).select("id,owner_id,posted_at,payload,hidden_at,hidden_reason,expires_at")
  check(error)
  if (!data?.length) return { ok: false, reason: "This ad is no longer on the board." }
  const updated = unpack(data[0] as Row, owner)
  if (!updated) return { ok: false, reason: "That ad could not be read." }
  return { ok: true, value: updated }
}

export async function renewListing(owner: string, id: string): Promise<Result<Listing>> {
  const owned = await ownedRow(owner, id)
  if (!owned.ok) return owned
  const current = cleanListing(owned.value.payload)
  if (!current) return { ok: false, reason: "That ad could not be read." }
  if (current.sold && !isListingExpired(owned.value.expires_at ?? undefined)) {
    return { ok: false, reason: "Mark the ad as available before renewing it." }
  }
  const postedAt = new Date().toISOString()
  const expiresAt = expiresAtFrom(postedAt)
  const stored = { ...current, id, sold: undefined, postedAt, hoursAgo: 0, expiresAt }
  const { data, error } = await boardDb().from("board_listings")
    .update({
      posted_at: postedAt,
      expires_at: expiresAt,
      expiry_reminder_sent_at: null,
      payload: payload(stored),
    })
    .eq("id", id).eq("owner_id", owner).select("id,owner_id,posted_at,payload,hidden_at,hidden_reason,expires_at")
  check(error)
  if (!data?.length) return { ok: false, reason: "This ad is no longer on the board." }
  const updated = unpack(data[0] as Row, owner)
  if (!updated) return { ok: false, reason: "That ad could not be read." }
  return { ok: true, value: updated }
}

async function postingQuota(owner: string): Promise<Result<true>> {
  const db = boardDb()
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const [total, recent] = await Promise.all([
    db.from("board_listings").select("id", { count: "exact", head: true }).eq("owner_id", owner),
    db.from("board_listings").select("id", { count: "exact", head: true }).eq("owner_id", owner).gte("posted_at", hourAgo),
  ])
  check(total.error)
  check(recent.error)
  if ((total.count ?? 0) >= 40) return { ok: false, reason: "This browser has reached the limit of 40 ads." }
  if ((recent.count ?? 0) >= 8) return { ok: false, reason: "Too many ads posted recently. Try again in an hour." }
  return { ok: true, value: true }
}
export async function deleteListing(owner: string, id: string): Promise<Result<true>> {
  const db = boardDb()
  const { data, error } = await db.from("board_listings").delete().eq("id", id).eq("owner_id", owner).select("payload")
  check(error)
  if (!data?.length) return { ok: false, reason: "This ad is no longer on the board or is not yours." }
  const { error: saveError } = await db.from("board_saves").delete().eq("listing_id", id)
  check(saveError)
  const old = cleanListing(data[0].payload)
  if (old) {
    for (const url of listingPhotoList(old)) await removePhoto(url)
  }
  return { ok: true, value: true }
}
async function exists(id: string) {
  if (seedIds.has(id)) return true
  const { data, error } = await boardDb().from("board_listings").select("id").eq("id", id).maybeSingle()
  check(error)
  return Boolean(data)
}
export async function toggleSave(owner: string, id: string): Promise<Result<string[]>> {
  if (!id || id.length > 80 || !await exists(id)) return { ok: false, reason: "That listing is no longer on the board." }
  const db = boardDb()
  const { data: existing, error: readError } = await db.from("board_saves").select("listing_id").eq("owner_id", owner).eq("listing_id", id).maybeSingle()
  check(readError)
  const { error } = existing ? await db.from("board_saves").delete().eq("owner_id", owner).eq("listing_id", id)
    : await db.from("board_saves").insert({ owner_id: owner, listing_id: id })
  check(error)
  const { data, error: listError } = await db.from("board_saves").select("listing_id").eq("owner_id", owner).order("created_at", { ascending: false })
  check(listError)
  return { ok: true, value: (data ?? []).map((row) => row.listing_id) }
}
export async function createMessage(viewerId: string, listingId: string, body: string): Promise<Result<BoardMessage[]>> {
  const reason = messageError(body.trim())
  if (reason) return { ok: false, reason }
  if (seedIds.has(listingId)) {
    return { ok: false, reason: "Sample listings cannot receive messages. Open a live ad instead." }
  }
  const db = boardDb()
  const { data: row, error } = await db
    .from("board_listings")
    .select("id,owner_id,posted_at,payload,hidden_at,hidden_reason,expires_at")
    .eq("id", listingId)
    .maybeSingle()
  check(error)
  if (!row) return { ok: false, reason: "That listing is no longer on the board." }
  if (row.owner_id === viewerId) return { ok: false, reason: "This is your ad." }
  if (row.hidden_at) return { ok: false, reason: "That listing is no longer on the board." }
  const listing = unpack(row as Row)
  if (!listing) return { ok: false, reason: "That listing is no longer on the board." }
  if (isListingExpired(listing.expiresAt)) return { ok: false, reason: "That listing has expired." }
  if (listing.sold) return { ok: false, reason: "This ad is marked sold." }

  const { data: existing, error: existingError } = await db
    .from("board_conversations")
    .select("id,listing_id,listing_owner_id,buyer_id,listing_title,seller_name,buyer_last_read_at,seller_last_read_at")
    .eq("listing_id", listingId)
    .eq("buyer_id", viewerId)
    .maybeSingle()
  check(existingError)

  let conversation = existing as ConversationRow | null
  if (!conversation) {
    const profiles = await profilesByUserIds([row.owner_id as string])
    const sellerName =
      profiles.get(row.owner_id as string)?.displayName?.trim() || listing.sellerName
    const created: ConversationRow = {
      id: crypto.randomUUID(),
      listing_id: listingId,
      listing_owner_id: row.owner_id,
      buyer_id: viewerId,
      listing_title: listing.title,
      seller_name: sellerName,
      buyer_last_read_at: new Date().toISOString(),
      seller_last_read_at: null,
    }
    const { error: insertConversation } = await db.from("board_conversations").insert({
      id: created.id,
      listing_id: created.listing_id,
      listing_owner_id: created.listing_owner_id,
      buyer_id: created.buyer_id,
      listing_title: created.listing_title,
      seller_name: created.seller_name,
      buyer_last_read_at: created.buyer_last_read_at,
      updated_at: new Date().toISOString(),
    })
    check(insertConversation)
    conversation = created
  }

  return appendMessage(viewerId, conversation, body.trim())
}

export async function replyToConversation(
  viewerId: string,
  conversationId: string,
  body: string,
): Promise<Result<BoardMessage[]>> {
  const reason = messageError(body.trim())
  if (reason) return { ok: false, reason }
  const db = boardDb()
  const { data: conversation, error } = await db
    .from("board_conversations")
    .select("id,listing_id,listing_owner_id,buyer_id,listing_title,seller_name,buyer_last_read_at,seller_last_read_at")
    .eq("id", conversationId)
    .maybeSingle()
  check(error)
  if (!conversation) return { ok: false, reason: "That conversation was not found." }
  if (conversation.buyer_id !== viewerId && conversation.listing_owner_id !== viewerId) {
    return { ok: false, reason: "This conversation is not yours." }
  }
  return appendMessage(viewerId, conversation as ConversationRow, body.trim())
}

async function appendMessage(
  viewerId: string,
  conversation: ConversationRow,
  body: string,
): Promise<Result<BoardMessage[]>> {
  const db = boardDb()
  const sentAt = new Date().toISOString()
  const messageId = crypto.randomUUID()
  const viewerIsSeller = conversation.listing_owner_id === viewerId
  const { error: insertError } = await db.from("board_conversation_messages").insert({
    id: messageId,
    conversation_id: conversation.id,
    sender_id: viewerId,
    body,
    sent_at: sentAt,
  })
  check(insertError)
  const { error: touchError } = await db
    .from("board_conversations")
    .update({
      updated_at: sentAt,
      listing_title: conversation.listing_title,
      ...(viewerIsSeller
        ? { seller_last_read_at: sentAt }
        : { buyer_last_read_at: sentAt }),
    })
    .eq("id", conversation.id)
  check(touchError)
  return { ok: true, value: await listMessagesFor(viewerId) }
}

export async function markMessagesRead(viewerId: string, conversationId: string): Promise<Result<BoardMessage[]>> {
  const db = boardDb()
  const { data: conversation, error } = await db
    .from("board_conversations")
    .select("id,listing_owner_id,buyer_id")
    .eq("id", conversationId)
    .maybeSingle()
  check(error)
  if (!conversation) return { ok: false, reason: "That conversation was not found." }
  if (conversation.buyer_id !== viewerId && conversation.listing_owner_id !== viewerId) {
    return { ok: false, reason: "This conversation is not yours." }
  }
  const now = new Date().toISOString()
  const patch =
    conversation.listing_owner_id === viewerId ? { seller_last_read_at: now } : { buyer_last_read_at: now }
  const { error: updateError } = await db.from("board_conversations").update(patch).eq("id", conversation.id)
  check(updateError)
  return { ok: true, value: await listMessagesFor(viewerId) }
}

export async function importBoard(owner: string, input: unknown): Promise<{ imported: number }> {
  const state = parseBoardState(input)
  let imported = 0
  for (const item of state.posted.slice(0, 40)) if ((await createListing(owner, item)).ok) imported++
  for (const id of state.savedIds.slice(0, 200)) {
    if (!(await exists(id))) continue
    const { error } = await boardDb()
      .from("board_saves")
      .upsert({ owner_id: owner, listing_id: id }, { onConflict: "owner_id,listing_id" })
    check(error)
    imported++
  }
  return { imported }
}

export type ClaimResult = {
  listings: number
  saves: number
  messages: number
  alreadyClaimed: boolean
}

/** Move anonymous cookie-owned board rows onto the signed-in auth user. */
export async function claimSession(
  userId: string,
  sessionId: string | undefined,
  profile?: { email?: string; displayName?: string },
): Promise<Result<ClaimResult>> {
  const db = boardDb()
  const { data: existingProfile, error: existingProfileError } = await db
    .from("board_profiles")
    .select("display_name")
    .eq("user_id", userId)
    .maybeSingle()
  check(existingProfileError)
  const keepName =
    typeof existingProfile?.display_name === "string" && existingProfile.display_name.trim()
      ? existingProfile.display_name.trim()
      : (profile?.displayName ?? null)
  const { error: profileError } = await db.from("board_profiles").upsert(
    {
      user_id: userId,
      email: profile?.email ?? null,
      display_name: keepName,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  )
  check(profileError)

  if (!sessionId || sessionId === userId) {
    return { ok: true, value: { listings: 0, saves: 0, messages: 0, alreadyClaimed: false } }
  }

  const { data: prior, error: priorError } = await db
    .from("board_session_claims")
    .select("user_id")
    .eq("session_id", sessionId)
    .maybeSingle()
  check(priorError)
  if (prior?.user_id && prior.user_id !== userId) {
    return { ok: false, reason: "This browser session was already linked to another account." }
  }
  if (prior?.user_id === userId) {
    return { ok: true, value: { listings: 0, saves: 0, messages: 0, alreadyClaimed: true } }
  }

  const { data: listings, error: listingsError } = await db
    .from("board_listings")
    .update({ owner_id: userId })
    .eq("owner_id", sessionId)
    .select("id")
  check(listingsError)

  const { data: sessionSaves, error: savesReadError } = await db
    .from("board_saves")
    .select("listing_id")
    .eq("owner_id", sessionId)
  check(savesReadError)
  let savesMoved = 0
  for (const row of sessionSaves ?? []) {
    const { error } = await db.from("board_saves").upsert(
      { owner_id: userId, listing_id: row.listing_id },
      { onConflict: "owner_id,listing_id" },
    )
    check(error)
    savesMoved++
  }
  const { error: savesDeleteError } = await db.from("board_saves").delete().eq("owner_id", sessionId)
  check(savesDeleteError)

  const { data: messages, error: messagesError } = await db
    .from("board_messages")
    .update({ owner_id: userId })
    .eq("owner_id", sessionId)
    .select("id")
  check(messagesError)

  const { data: buyerThreads, error: buyerThreadError } = await db
    .from("board_conversations")
    .update({ buyer_id: userId })
    .eq("buyer_id", sessionId)
    .select("id")
  check(buyerThreadError)
  const { data: sellerThreads, error: sellerThreadError } = await db
    .from("board_conversations")
    .update({ listing_owner_id: userId })
    .eq("listing_owner_id", sessionId)
    .select("id")
  check(sellerThreadError)
  const { data: sentRows, error: sentError } = await db
    .from("board_conversation_messages")
    .update({ sender_id: userId })
    .eq("sender_id", sessionId)
    .select("id")
  check(sentError)

  const { error: claimError } = await db.from("board_session_claims").insert({
    session_id: sessionId,
    user_id: userId,
  })
  if (claimError && claimError.code !== "23505") check(claimError)

  return {
    ok: true,
    value: {
      listings: listings?.length ?? 0,
      saves: savesMoved,
      messages:
        (messages?.length ?? 0) +
        (buyerThreads?.length ?? 0) +
        (sellerThreads?.length ?? 0) +
        (sentRows?.length ?? 0),
      alreadyClaimed: false,
    },
  }
}

export type BoardReport = {
  id: string
  listingId: string
  listingTitle: string
  listingOwnerId: string
  reporterId: string
  reason: ReportReasonId
  note: string | null
  status: "pending" | "dismissed" | "actioned"
  createdAt: string
  listingHidden: boolean
}

const reportHourLimit = 5

export async function createReport(
  reporterId: string,
  listingId: string,
  reason: string,
  note: string,
): Promise<Result<{ pendingCount: number; autoHidden: boolean }>> {
  if (!listingIdPattern.test(listingId) || seedIds.has(listingId)) {
    return { ok: false, reason: "Sample listings cannot be reported." }
  }
  if (!isReportReasonId(reason)) return { ok: false, reason: "Choose a reason for the report." }
  const noteReason = reportNoteError(note)
  if (noteReason) return { ok: false, reason: noteReason }

  const db = boardDb()
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count: recentCount, error: recentError } = await db
    .from("board_reports")
    .select("id", { count: "exact", head: true })
    .eq("reporter_id", reporterId)
    .gte("created_at", hourAgo)
  check(recentError)
  if ((recentCount ?? 0) >= reportHourLimit) {
    return { ok: false, reason: "Too many reports recently. Try again in an hour." }
  }

  const { data: row, error } = await db
    .from("board_listings")
    .select("id,owner_id,posted_at,payload,hidden_at,hidden_reason,expires_at")
    .eq("id", listingId)
    .maybeSingle()
  check(error)
  if (!row) return { ok: false, reason: "That listing is no longer on the board." }
  if (row.owner_id === reporterId) return { ok: false, reason: "You cannot report your own ad." }

  const listing = unpack(row as Row)
  if (!listing) return { ok: false, reason: "That listing is no longer on the board." }
  if (isListingExpired(listing.expiresAt)) return { ok: false, reason: "That listing has expired." }

  const { error: insertError } = await db.from("board_reports").insert({
    id: crypto.randomUUID(),
    listing_id: listingId,
    reporter_id: reporterId,
    reason,
    note: note.trim() || null,
    status: "pending",
  })
  if (insertError) {
    if (insertError.code === "23505") {
      return { ok: false, reason: "You already reported this ad." }
    }
    check(insertError)
  }

  const { count: pendingCount, error: pendingError } = await db
    .from("board_reports")
    .select("id", { count: "exact", head: true })
    .eq("listing_id", listingId)
    .eq("status", "pending")
  check(pendingError)
  const pending = pendingCount ?? 0
  const threshold = reportAutoHideThreshold()
  let autoHidden = false
  if (pending >= threshold && !row.hidden_at) {
    const { error: hideError } = await db
      .from("board_listings")
      .update({ hidden_at: new Date().toISOString(), hidden_reason: "reports" })
      .eq("id", listingId)
      .is("hidden_at", null)
    check(hideError)
    autoHidden = true
  }

  return { ok: true, value: { pendingCount: pending, autoHidden } }
}

export async function listPendingReports(): Promise<BoardReport[]> {
  const db = boardDb()
  const { data: reports, error } = await db
    .from("board_reports")
    .select("id,listing_id,reporter_id,reason,note,status,created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(200)
  check(error)
  if (!reports?.length) return []
  const listingIds = [...new Set(reports.map((row) => row.listing_id as string))]
  const { data: listings, error: listingError } = await db
    .from("board_listings")
    .select("id,owner_id,posted_at,payload,hidden_at,hidden_reason,expires_at")
    .in("id", listingIds)
  check(listingError)
  const byId = new Map((listings ?? []).map((row) => [row.id as string, row as Row]))
  return reports.flatMap((row) => {
    const listing = byId.get(row.listing_id as string)
    const unpacked = listing ? unpack(listing) : undefined
    if (!isReportReasonId(row.reason as string)) return []
    return [
      {
        id: row.id as string,
        listingId: row.listing_id as string,
        listingTitle: unpacked?.title ?? "(removed listing)",
        listingOwnerId: listing?.owner_id ?? "",
        reporterId: row.reporter_id as string,
        reason: row.reason as ReportReasonId,
        note: typeof row.note === "string" ? row.note : null,
        status: "pending",
        createdAt: row.created_at as string,
        listingHidden: Boolean(listing?.hidden_at),
      },
    ]
  })
}

export async function dismissReport(adminId: string, reportId: string): Promise<Result<true>> {
  const db = boardDb()
  const { data: report, error } = await db
    .from("board_reports")
    .select("id,listing_id,status")
    .eq("id", reportId)
    .maybeSingle()
  check(error)
  if (!report) return { ok: false, reason: "That report was not found." }
  if (report.status !== "pending") return { ok: false, reason: "That report was already reviewed." }

  const { error: updateError } = await db
    .from("board_reports")
    .update({
      status: "dismissed",
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminId,
    })
    .eq("id", reportId)
    .eq("status", "pending")
  check(updateError)

  const listingId = report.listing_id as string
  const { count: pendingCount, error: pendingError } = await db
    .from("board_reports")
    .select("id", { count: "exact", head: true })
    .eq("listing_id", listingId)
    .eq("status", "pending")
  check(pendingError)
  if ((pendingCount ?? 0) < reportAutoHideThreshold()) {
    const { error: unhideError } = await db
      .from("board_listings")
      .update({ hidden_at: null, hidden_reason: null })
      .eq("id", listingId)
      .eq("hidden_reason", "reports")
    check(unhideError)
  }

  return { ok: true, value: true }
}

export async function hideListingForReport(adminId: string, reportId: string): Promise<Result<true>> {
  const db = boardDb()
  const { data: report, error } = await db
    .from("board_reports")
    .select("id,listing_id,status")
    .eq("id", reportId)
    .maybeSingle()
  check(error)
  if (!report) return { ok: false, reason: "That report was not found." }
  if (report.status !== "pending") return { ok: false, reason: "That report was already reviewed." }

  const listingId = report.listing_id as string
  const { error: hideError } = await db
    .from("board_listings")
    .update({ hidden_at: new Date().toISOString(), hidden_reason: "admin" })
    .eq("id", listingId)
  check(hideError)

  const { error: updateError } = await db
    .from("board_reports")
    .update({
      status: "actioned",
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminId,
    })
    .eq("listing_id", listingId)
    .eq("status", "pending")
  check(updateError)

  return { ok: true, value: true }
}

export async function removeListingForReport(adminId: string, reportId: string): Promise<Result<true>> {
  const db = boardDb()
  const { data: report, error } = await db
    .from("board_reports")
    .select("id,listing_id,status")
    .eq("id", reportId)
    .maybeSingle()
  check(error)
  if (!report) return { ok: false, reason: "That report was not found." }
  if (report.status !== "pending") return { ok: false, reason: "That report was already reviewed." }

  const listingId = report.listing_id as string
  const { data: row, error: readError } = await db
    .from("board_listings")
    .select("payload")
    .eq("id", listingId)
    .maybeSingle()
  check(readError)

  const { error: markError } = await db
    .from("board_reports")
    .update({
      status: "actioned",
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminId,
    })
    .eq("listing_id", listingId)
    .eq("status", "pending")
  check(markError)

  if (row) {
    const { error: deleteError } = await db.from("board_listings").delete().eq("id", listingId)
    check(deleteError)
    const { error: saveError } = await db.from("board_saves").delete().eq("listing_id", listingId)
    check(saveError)
    const old = cleanListing(row.payload)
    if (old) {
      for (const url of listingPhotoList(old)) await removePhoto(url)
    }
  }

  return { ok: true, value: true }
}

export type ExpiryReminderSummary = {
  considered: number
  sent: number
  skippedNoEmail: number
  failed: number
}

/** Daily cron: email signed-in owners whose ads expire within 7 days (once per renew cycle). */
export async function sendExpiryReminders(): Promise<ExpiryReminderSummary> {
  const db = boardDb()
  const now = new Date()
  const soon = new Date(now.getTime() + expiryNoticeDays * 24 * 60 * 60 * 1000).toISOString()
  const { data: rows, error } = await db
    .from("board_listings")
    .select("id,owner_id,posted_at,payload,expires_at,expiry_reminder_sent_at")
    .is("expiry_reminder_sent_at", null)
    .gt("expires_at", now.toISOString())
    .lte("expires_at", soon)
    .limit(200)
  check(error)

  let sent = 0
  let skippedNoEmail = 0
  let failed = 0
  for (const row of rows ?? []) {
    const listing = unpack(row as Row)
    if (!listing || listing.sold) continue
    const { data: profile, error: profileError } = await db
      .from("board_profiles")
      .select("email")
      .eq("user_id", row.owner_id)
      .maybeSingle()
    check(profileError)
    const email = typeof profile?.email === "string" ? profile.email.trim() : ""
    if (!email.includes("@")) {
      skippedNoEmail++
      continue
    }
    const days = Math.max(
      1,
      Math.ceil((new Date(row.expires_at as string).getTime() - now.getTime()) / 86_400_000),
    )
    const result = await sendEmail({
      to: email,
      subject: `Your ad “${listing.title}” expires in ${days} day${days === 1 ? "" : "s"}`,
      text: [
        `Your africa classifieds ad “${listing.title}” expires in ${days} day${days === 1 ? "" : "s"}.`,
        "Renew it from My ads to keep it on the board for another 60 days.",
        "",
        "If you did not post this ad, you can ignore this message.",
      ].join("\n"),
    })
    if (!result.ok) {
      failed++
      continue
    }
    const { error: markError } = await db
      .from("board_listings")
      .update({ expiry_reminder_sent_at: now.toISOString() })
      .eq("id", row.id)
      .is("expiry_reminder_sent_at", null)
    check(markError)
    sent++
  }

  return {
    considered: rows?.length ?? 0,
    sent,
    skippedNoEmail,
    failed,
  }
}



