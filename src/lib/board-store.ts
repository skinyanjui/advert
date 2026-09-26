import { seedListings } from "@/lib/catalog"
import { database } from "@/lib/db"
import { hoursAgoOf } from "@/lib/format"
import { acceptListing } from "@/lib/listing-rules"
import { isBoardMessage, messageError, sampleReply, type BoardMessage } from "@/lib/messages"
import { cleanListing, parseBoardState, type BoardState } from "@/lib/board-payload"
import type { Listing } from "@/lib/types"

const seedIds = new Set(seedListings.map((listing) => listing.id))
const adIdPattern = /^ad-[a-zA-Z0-9-]{1,64}$/
const imageLimit = 1_500_000
const messageLimit = 200

type Result<T> = { ok: true; value: T } | { ok: false; reason: string }

export function listBoard(token: string | undefined): BoardState {
  const db = database()
  const posted = db
    .prepare("SELECT id, owner_token, posted_at, payload FROM listings ORDER BY posted_at DESC")
    .all()
    .flatMap((row) => {
      const listing = listingFromRow(row, token)
      return listing ? [listing] : []
    })
  const savedIds = token
    ? db
        .prepare("SELECT listing_id FROM saves WHERE owner_token = ? ORDER BY created_at DESC")
        .all(token)
        .flatMap((row) => (typeof row.listing_id === "string" ? [row.listing_id] : []))
    : []
  const messages = token
    ? db
        .prepare("SELECT payload FROM messages WHERE owner_token = ? ORDER BY sent_at ASC")
        .all(token)
        .flatMap((row) => {
          if (typeof row.payload !== "string") return []
          try {
            const parsed: unknown = JSON.parse(row.payload)
            return isBoardMessage(parsed) ? [parsed] : []
          } catch {
            return []
          }
        })
    : []
  return { posted, savedIds, messages }
}

export function createListing(token: string, input: unknown): Result<Listing> {
  const listing = cleanListing(input)
  if (!listing) return { ok: false, reason: "That ad could not be read." }
  if (seedIds.has(listing.id)) return { ok: false, reason: "That listing is already on the board." }
  if (!adIdPattern.test(listing.id)) return { ok: false, reason: "That ad could not be read." }
  if (listing.image.length > imageLimit) return { ok: false, reason: "The photo is too large. Try a smaller one." }
  const accepted = acceptListing({ ...listing, mine: true })
  if (!accepted.ok) return accepted
  const existing = database().prepare("SELECT id FROM listings WHERE id = ?").get(listing.id)
  if (existing) return { ok: false, reason: "That listing is already on the board." }
  const stored = accepted.listing
  const postedAt = stored.postedAt ?? new Date().toISOString()
  database()
    .prepare("INSERT INTO listings (id, owner_token, posted_at, payload) VALUES (?, ?, ?, ?)")
    .run(stored.id, token, postedAt, payloadOf({ ...stored, postedAt }))
  const saved = listingFromRow(
    { id: stored.id, owner_token: token, posted_at: postedAt, payload: payloadOf({ ...stored, postedAt }) },
    token,
  )
  return saved ? { ok: true, value: saved } : { ok: false, reason: "That ad could not be read." }
}

export function updateListing(token: string, id: string, input: unknown): Result<Listing> {
  const listing = cleanListing(input)
  if (!listing || listing.id !== id) return { ok: false, reason: "That ad could not be read." }
  if (seedIds.has(id)) return { ok: false, reason: "That listing is already on the board." }
  if (listing.image.length > imageLimit) return { ok: false, reason: "The photo is too large. Try a smaller one." }
  const row = database().prepare("SELECT id, owner_token, posted_at, payload FROM listings WHERE id = ?").get(id)
  if (!row) return { ok: false, reason: "This ad is no longer on the board." }
  if (row.owner_token !== token) return { ok: false, reason: "This ad is not yours." }
  const accepted = acceptListing({ ...listing, mine: true })
  if (!accepted.ok) return accepted
  const postedAt = typeof row.posted_at === "string" ? row.posted_at : new Date().toISOString()
  const stored = { ...accepted.listing, id, postedAt, hoursAgo: hoursAgoOf({ hoursAgo: 0, postedAt }) }
  database()
    .prepare("UPDATE listings SET payload = ?, posted_at = ? WHERE id = ? AND owner_token = ?")
    .run(payloadOf(stored), postedAt, id, token)
  const saved = listingFromRow({ id, owner_token: token, posted_at: postedAt, payload: payloadOf(stored) }, token)
  return saved ? { ok: true, value: saved } : { ok: false, reason: "That ad could not be read." }
}

export function deleteListing(token: string, id: string): Result<true> {
  const db = database()
  const row = db.prepare("SELECT owner_token FROM listings WHERE id = ?").get(id)
  if (!row) return { ok: false, reason: "This ad is no longer on the board." }
  if (row.owner_token !== token) return { ok: false, reason: "This ad is not yours." }
  db.exec("BEGIN")
  try {
    db.prepare("DELETE FROM listings WHERE id = ? AND owner_token = ?").run(id, token)
    db.prepare("DELETE FROM saves WHERE listing_id = ?").run(id)
    db.exec("COMMIT")
  } catch (error) {
    db.exec("ROLLBACK")
    throw error
  }
  return { ok: true, value: true }
}

export function toggleSave(token: string, listingId: string): Result<string[]> {
  if (!listingId || listingId.length > 80) return { ok: false, reason: "That listing is no longer on the board." }
  if (!listingExists(listingId)) return { ok: false, reason: "That listing is no longer on the board." }
  const db = database()
  const existing = db.prepare("SELECT listing_id FROM saves WHERE owner_token = ? AND listing_id = ?").get(token, listingId)
  if (existing) {
    db.prepare("DELETE FROM saves WHERE owner_token = ? AND listing_id = ?").run(token, listingId)
  } else {
    db.prepare("INSERT INTO saves (owner_token, listing_id, created_at) VALUES (?, ?, ?)").run(
      token,
      listingId,
      new Date().toISOString(),
    )
  }
  return { ok: true, value: listBoard(token).savedIds }
}

export function createMessage(token: string, listingId: string, body: string): Result<BoardMessage[]> {
  const text = body.trim()
  const error = messageError(text)
  if (error) return { ok: false, reason: error }
  if (!listingExists(listingId)) return { ok: false, reason: "That listing is no longer on the board." }
  const owned = database().prepare("SELECT id FROM listings WHERE id = ? AND owner_token = ?").get(listingId, token)
  if (owned) return { ok: false, reason: "This is your ad." }
  const listing = findListing(listingId)
  if (!listing) return { ok: false, reason: "That listing is no longer on the board." }
  const sentAt = new Date().toISOString()
  const yours: BoardMessage = {
    id: crypto.randomUUID(),
    listingId,
    listingTitle: listing.title,
    sellerName: listing.sellerName,
    body: text,
    sentAt,
    role: "you",
    read: true,
  }
  const reply: BoardMessage = {
    id: crypto.randomUUID(),
    listingId,
    listingTitle: listing.title,
    sellerName: listing.sellerName,
    body: sampleReply(listing.title),
    sentAt: new Date(Date.now() + 1).toISOString(),
    role: "sample",
    read: false,
  }
  const db = database()
  db.exec("BEGIN")
  try {
    trimMessages(token, 2)
    insertMessage(token, yours)
    insertMessage(token, reply)
    db.exec("COMMIT")
  } catch (error) {
    db.exec("ROLLBACK")
    throw error
  }
  return { ok: true, value: listBoard(token).messages }
}

export function markMessagesRead(token: string, listingId: string): Result<BoardMessage[]> {
  const db = database()
  const rows = db.prepare("SELECT id, payload FROM messages WHERE owner_token = ? AND listing_id = ?").all(token, listingId)
  db.exec("BEGIN")
  try {
    for (const row of rows) {
      if (typeof row.payload !== "string" || typeof row.id !== "string") continue
      try {
        const parsed: unknown = JSON.parse(row.payload)
        if (!isBoardMessage(parsed) || parsed.read) continue
        db.prepare("UPDATE messages SET payload = ? WHERE id = ? AND owner_token = ?").run(
          JSON.stringify({ ...parsed, read: true }),
          row.id,
          token,
        )
      } catch {
        continue
      }
    }
    db.exec("COMMIT")
  } catch (error) {
    db.exec("ROLLBACK")
    throw error
  }
  return { ok: true, value: listBoard(token).messages }
}

export function importBoard(token: string, input: unknown): { imported: number } {
  const state = parseBoardState(input)
  let imported = 0
  for (const listing of state.posted.slice(0, 40)) {
    const created = createListing(token, listing)
    if (created.ok) imported += 1
  }
  const db = database()
  for (const id of state.savedIds) {
    if (!listingExists(id)) continue
    db.prepare("INSERT OR IGNORE INTO saves (owner_token, listing_id, created_at) VALUES (?, ?, ?)").run(
      token,
      id,
      new Date().toISOString(),
    )
    imported += 1
  }
  for (const message of state.messages) {
    if (!message.id || message.id.length > 80) continue
    const changes = db
      .prepare(
        "INSERT OR IGNORE INTO messages (id, owner_token, listing_id, sent_at, payload) VALUES (?, ?, ?, ?, ?)",
      )
      .run(message.id, token, message.listingId, message.sentAt, JSON.stringify(message)).changes
    if (changes > 0) imported += 1
  }
  return { imported }
}

function listingExists(id: string): boolean {
  if (seedIds.has(id)) return true
  return Boolean(database().prepare("SELECT id FROM listings WHERE id = ?").get(id))
}

function findListing(id: string): Listing | undefined {
  const seed = seedListings.find((listing) => listing.id === id)
  if (seed) return seed
  const row = database().prepare("SELECT id, owner_token, posted_at, payload FROM listings WHERE id = ?").get(id)
  return row ? listingFromRow(row, undefined) : undefined
}

function listingFromRow(row: Record<string, string | number | bigint | null | Uint8Array>, token: string | undefined): Listing | undefined {
  if (typeof row.payload !== "string" || typeof row.id !== "string") return undefined
  try {
    const parsed: unknown = JSON.parse(row.payload)
    const listing = cleanListing(parsed)
    if (!listing) return undefined
    const postedAt = typeof row.posted_at === "string" ? row.posted_at : listing.postedAt
    const owner = typeof row.owner_token === "string" ? row.owner_token : ""
    return {
      ...listing,
      id: row.id,
      postedAt,
      hoursAgo: hoursAgoOf({ hoursAgo: listing.hoursAgo, postedAt }),
      featured: undefined,
      mine: Boolean(token) && owner === token,
    }
  } catch {
    return undefined
  }
}

function payloadOf(listing: Listing): string {
  return JSON.stringify({ ...listing, mine: undefined, featured: undefined })
}

function insertMessage(token: string, message: BoardMessage) {
  database()
    .prepare("INSERT INTO messages (id, owner_token, listing_id, sent_at, payload) VALUES (?, ?, ?, ?, ?)")
    .run(message.id, token, message.listingId, message.sentAt, JSON.stringify(message))
}

function trimMessages(token: string, incoming: number) {
  const row = database().prepare("SELECT COUNT(*) AS count FROM messages WHERE owner_token = ?").get(token)
  const count = typeof row?.count === "number" ? row.count : Number(row?.count ?? 0)
  const extra = count + incoming - messageLimit
  if (extra <= 0) return
  database()
    .prepare(
      "DELETE FROM messages WHERE id IN (SELECT id FROM messages WHERE owner_token = ? ORDER BY sent_at ASC LIMIT ?)",
    )
    .run(token, extra)
}
