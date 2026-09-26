import "server-only"

import { boardDb } from "@/lib/board-db"
import { seedListings } from "@/lib/catalog"
import { hoursAgoOf } from "@/lib/format"
import { acceptListing } from "@/lib/listing-rules"
import { isBoardMessage, messageError, sampleReply, type BoardMessage } from "@/lib/messages"
import { cleanListing, parseBoardState, type BoardState } from "@/lib/board-payload"
import type { Listing } from "@/lib/types"

type Result<T> = { ok: true; value: T } | { ok: false; reason: string }
type Row = { id: string; owner_id: string; posted_at: string; payload: unknown }
const seedIds = new Set(seedListings.map((item) => item.id))
const listingId = /^ad-[a-zA-Z0-9-]{1,64}$/
function check(error: { message: string } | null) { if (error) throw new Error(error.message) }
function unpack(row: Row, owner?: string): Listing | undefined {
  const listing = cleanListing(row.payload)
  return listing && { ...listing, id: row.id, postedAt: row.posted_at,
    hoursAgo: hoursAgoOf({ hoursAgo: listing.hoursAgo, postedAt: row.posted_at }),
    mine: Boolean(owner) && owner === row.owner_id, featured: undefined }
}
function payload(listing: Listing) {
  return { ...listing, mine: undefined, featured: undefined, sold: listing.sold === true ? true : undefined }
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
async function removePhoto(image: string) {
  const path = photoPath(image)
  if (!path) return
  const { error } = await boardDb().storage.from("listing-photos").remove([path])
  if (error) console.error("Could not remove listing photo", error)
}
export async function listBoard(owner: string): Promise<BoardState> {
  const db = boardDb()
  const [posted, saved, messages] = await Promise.all([
    db.from("board_listings").select("id,owner_id,posted_at,payload").order("posted_at", { ascending: false }).limit(500),
    db.from("board_saves").select("listing_id").eq("owner_id", owner).order("created_at", { ascending: false }),
    db.from("board_messages").select("payload").eq("owner_id", owner).order("sent_at").limit(200),
  ])
  check(posted.error); check(saved.error); check(messages.error)
  return { posted: (posted.data ?? []).flatMap((row) => { const item = unpack(row, owner); return item ? [item] : [] }),
    savedIds: (saved.data ?? []).map((row) => row.listing_id),
    messages: (messages.data ?? []).flatMap((row) => isBoardMessage(row.payload) ? [row.payload] : []) }
}
export async function createListing(owner: string, input: unknown): Promise<Result<Listing>> {
  const listing = cleanListing(input)
  if (!listing || !listingId.test(listing.id)) return { ok: false, reason: "That ad could not be read." }
  if (seedIds.has(listing.id)) return { ok: false, reason: "That listing is already on the board." }
  const accepted = acceptListing({ ...listing, mine: true, sold: undefined })
  if (!accepted.ok) return accepted
  const quota = await postingQuota(owner)
  if (!quota.ok) return quota
  const photo = await storePhoto(listing.image, owner)
  if (!photo.ok) return photo
  const postedAt = new Date().toISOString()
  const stored = { ...accepted.listing, image: photo.value, postedAt }
  const { error } = await boardDb().from("board_listings").insert({ id: listing.id, owner_id: owner, posted_at: postedAt, payload: payload(stored) })
  if (error) {
    if (photo.value !== listing.image) await removePhoto(photo.value)
    if (error.code === "23505") return { ok: false, reason: "That listing is already on the board." }
    check(error)
  }
  return { ok: true, value: { ...stored, mine: true } }
}
export async function updateListing(owner: string, id: string, input: unknown): Promise<Result<Listing>> {
  const listing = cleanListing(input)
  if (!listing || listing.id !== id || seedIds.has(id)) return { ok: false, reason: "That ad could not be read." }
  const db = boardDb()
  const { data: row, error: readError } = await db.from("board_listings").select("id,owner_id,posted_at,payload").eq("id", id).maybeSingle()
  check(readError)
  if (!row) return { ok: false, reason: "This ad is no longer on the board." }
  if (row.owner_id !== owner) return { ok: false, reason: "This ad is not yours." }
  const old = cleanListing(row.payload)
  const accepted = acceptListing({ ...listing, mine: true, sold: listing.sold ?? old?.sold })
  if (!accepted.ok) return accepted
  const photo = await storePhoto(listing.image, owner, old?.image)
  if (!photo.ok) return photo
  const stored = { ...accepted.listing, id, image: photo.value, postedAt: row.posted_at,
    hoursAgo: hoursAgoOf({ hoursAgo: 0, postedAt: row.posted_at }) }
  const { data, error } = await db.from("board_listings").update({ payload: payload(stored) })
    .eq("id", id).eq("owner_id", owner).select("id")
  if (error || !data?.length) {
    if (photo.value !== listing.image) await removePhoto(photo.value)
    check(error)
    return { ok: false, reason: "This ad is no longer on the board." }
  }
  if (old?.image && old.image !== photo.value) await removePhoto(old.image)
  return { ok: true, value: { ...stored, mine: true } }
}

async function ownedRow(owner: string, id: string): Promise<Result<Row>> {
  if (!listingId.test(id) || seedIds.has(id)) return { ok: false, reason: "That ad could not be read." }
  const { data: row, error } = await boardDb().from("board_listings").select("id,owner_id,posted_at,payload").eq("id", id).maybeSingle()
  check(error)
  if (!row) return { ok: false, reason: "This ad is no longer on the board." }
  if (row.owner_id !== owner) return { ok: false, reason: "This ad is not yours." }
  return { ok: true, value: row }
}

export async function setListingSold(owner: string, id: string, sold: boolean): Promise<Result<Listing>> {
  const owned = await ownedRow(owner, id)
  if (!owned.ok) return owned
  const current = cleanListing(owned.value.payload)
  if (!current) return { ok: false, reason: "That ad could not be read." }
  const stored = { ...current, id, sold: sold ? true : undefined, postedAt: owned.value.posted_at,
    hoursAgo: hoursAgoOf({ hoursAgo: 0, postedAt: owned.value.posted_at }) }
  const { data, error } = await boardDb().from("board_listings").update({ payload: payload(stored) })
    .eq("id", id).eq("owner_id", owner).select("id")
  check(error)
  if (!data?.length) return { ok: false, reason: "This ad is no longer on the board." }
  return { ok: true, value: { ...stored, mine: true } }
}

export async function renewListing(owner: string, id: string): Promise<Result<Listing>> {
  const owned = await ownedRow(owner, id)
  if (!owned.ok) return owned
  const current = cleanListing(owned.value.payload)
  if (!current) return { ok: false, reason: "That ad could not be read." }
  if (current.sold) return { ok: false, reason: "Mark the ad as available before renewing it." }
  const postedAt = new Date().toISOString()
  const stored = { ...current, id, sold: undefined, postedAt, hoursAgo: 0 }
  const { data, error } = await boardDb().from("board_listings")
    .update({ posted_at: postedAt, payload: payload(stored) })
    .eq("id", id).eq("owner_id", owner).select("id")
  check(error)
  if (!data?.length) return { ok: false, reason: "This ad is no longer on the board." }
  return { ok: true, value: { ...stored, mine: true } }
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
  if (old) await removePhoto(old.image)
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
export async function createMessage(owner: string, id: string, body: string): Promise<Result<BoardMessage[]>> {
  const reason = messageError(body.trim())
  if (reason) return { ok: false, reason }
  const db = boardDb()
  const { data: row, error } = await db.from("board_listings").select("id,owner_id,posted_at,payload").eq("id", id).maybeSingle()
  check(error)
  if (row?.owner_id === owner) return { ok: false, reason: "This is your ad." }
  const listing = seedListings.find((item) => item.id === id) ?? (row ? unpack(row) : undefined)
  if (!listing) return { ok: false, reason: "That listing is no longer on the board." }
  if (listing.sold) return { ok: false, reason: "This ad is marked sold." }
  const now = Date.now()
  const yours: BoardMessage = { id: crypto.randomUUID(), listingId: id, listingTitle: listing.title, sellerName: listing.sellerName,
    body: body.trim(), sentAt: new Date(now).toISOString(), role: "you", read: true }
  const reply: BoardMessage = { ...yours, id: crypto.randomUUID(), body: sampleReply(listing.title),
    sentAt: new Date(now + 1).toISOString(), role: "sample", read: false }
  const { error: insertError } = await db.from("board_messages").insert([yours, reply].map((message) => ({
    id: message.id, owner_id: owner, listing_id: id, sent_at: message.sentAt, payload: message,
  })))
  check(insertError)
  return { ok: true, value: (await listBoard(owner)).messages }
}
export async function markMessagesRead(owner: string, id: string): Promise<Result<BoardMessage[]>> {
  const db = boardDb()
  const { data, error } = await db.from("board_messages").select("id,payload").eq("owner_id", owner).eq("listing_id", id)
  check(error)
  for (const row of data ?? []) {
    if (!isBoardMessage(row.payload) || row.payload.read) continue
    const { error: updateError } = await db.from("board_messages").update({ payload: { ...row.payload, read: true } })
      .eq("id", row.id).eq("owner_id", owner)
    check(updateError)
  }
  return { ok: true, value: (await listBoard(owner)).messages }
}
export async function importBoard(owner: string, input: unknown): Promise<{ imported: number }> {
  const state = parseBoardState(input)
  let imported = 0
  for (const item of state.posted.slice(0, 40)) if ((await createListing(owner, item)).ok) imported++
  for (const id of state.savedIds.slice(0, 200)) {
    if (!await exists(id)) continue
    const { error } = await boardDb().from("board_saves").upsert({ owner_id: owner, listing_id: id }, { onConflict: "owner_id,listing_id" })
    check(error)
    imported++
  }
  for (const message of state.messages.slice(-200)) {
    if (!await exists(message.listingId)) continue
    const { error } = await boardDb().from("board_messages").upsert({
      id: message.id, owner_id: owner, listing_id: message.listingId,
      sent_at: message.sentAt, payload: message,
    }, { onConflict: "id", ignoreDuplicates: true })
    check(error)
    imported++
  }
  return { imported }
}
