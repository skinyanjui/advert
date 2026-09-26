"use client"

import { createContext, useContext, useMemo, useSyncExternalStore } from "react"
import { toast } from "sonner"

import { parseBoardState, type BoardState } from "@/lib/board-payload"
import { seedListings } from "@/lib/catalog"
import type { BoardMessage } from "@/lib/messages"
import type { Listing } from "@/lib/types"

const ownerKey = "africa-classifieds-owner"
const legacyKey = "africa-classifieds-v1"
const migratedKey = "africa-classifieds-migrated"
const tokenPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type Snapshot = BoardState & { ready: boolean }

const emptyState: BoardState = { posted: [], savedIds: [], messages: [] }
const serverSnapshot: Snapshot = { ...emptyState, ready: false }

let memory: Snapshot = { ...emptyState, ready: false }
let inflight: Promise<void> | null = null

const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  void ensureLoaded()
  return () => listeners.delete(listener)
}

function readSnapshot(): Snapshot {
  return memory
}

function getServerSnapshot(): Snapshot {
  return serverSnapshot
}

function ownerToken(): string {
  const current = localStorage.getItem(ownerKey)
  if (current && tokenPattern.test(current)) return current
  const next = crypto.randomUUID()
  localStorage.setItem(ownerKey, next)
  return next
}

function requestHeaders(): HeadersInit {
  return { "content-type": "application/json", "x-owner-token": ownerToken() }
}

function ensureLoaded(): Promise<void> {
  if (memory.ready) return Promise.resolve()
  if (!inflight) inflight = loadBoard()
  return inflight
}

async function loadBoard() {
  try {
    await migrateLegacy()
  } catch {
    toast.error("Saved ads on this browser could not be moved into the database.")
  }
  try {
    const response = await fetch("/api/board", { headers: requestHeaders(), cache: "no-store" })
    if (!response.ok) throw new Error("board")
    const payload: unknown = await response.json()
    memory = { ...parseBoardState(payload), ready: true }
  } catch {
    memory = { ...emptyState, ready: true }
    toast.error("The board database did not respond. Sample ads are still here.")
  }
  emit()
}

async function migrateLegacy() {
  if (localStorage.getItem(migratedKey) === "1") return
  const raw = localStorage.getItem(legacyKey)
  if (!raw) {
    localStorage.setItem(migratedKey, "1")
    return
  }
  const response = await fetch("/api/board", {
    method: "POST",
    headers: requestHeaders(),
    body: raw,
  })
  if (!response.ok) throw new Error("migrate")
  localStorage.removeItem(legacyKey)
  localStorage.setItem(migratedKey, "1")
}

async function readFailure(response: Response, fallback: string): Promise<string> {
  try {
    const payload = (await response.json()) as { reason?: unknown }
    if (typeof payload.reason === "string" && payload.reason) return payload.reason
  } catch {
    return fallback
  }
  return fallback
}

type StoreResult = { ok: true } | { ok: false; reason: string }

async function addListing(listing: Listing): Promise<StoreResult> {
  await ensureLoaded()
  try {
    const response = await fetch("/api/listings", {
      method: "POST",
      headers: requestHeaders(),
      body: JSON.stringify(listing),
    })
    if (!response.ok) return { ok: false, reason: await readFailure(response, "The board database did not save that ad.") }
    const payload = (await response.json()) as { listing?: unknown }
    const saved = parseBoardState({ posted: [payload.listing], savedIds: [], messages: [] }).posted[0]
    if (!saved) return { ok: false, reason: "That ad could not be read." }
    memory = { ...memory, posted: [saved, ...memory.posted.filter((item) => item.id !== saved.id)], ready: true }
    emit()
    return { ok: true }
  } catch {
    return { ok: false, reason: "The board database did not save that ad." }
  }
}

async function updateListing(listing: Listing): Promise<StoreResult> {
  await ensureLoaded()
  try {
    const response = await fetch(`/api/listings/${encodeURIComponent(listing.id)}`, {
      method: "PATCH",
      headers: requestHeaders(),
      body: JSON.stringify(listing),
    })
    if (!response.ok) return { ok: false, reason: await readFailure(response, "The board database did not save that ad.") }
    const payload = (await response.json()) as { listing?: unknown }
    const saved = parseBoardState({ posted: [payload.listing], savedIds: [], messages: [] }).posted[0]
    if (!saved) return { ok: false, reason: "That ad could not be read." }
    const posted = memory.posted.some((item) => item.id === saved.id)
      ? memory.posted.map((item) => (item.id === saved.id ? saved : item))
      : [saved, ...memory.posted]
    memory = { ...memory, posted, ready: true }
    emit()
    return { ok: true }
  } catch {
    return { ok: false, reason: "The board database did not save that ad." }
  }
}

function removeListing(id: string) {
  void (async () => {
    await ensureLoaded()
    const previous = memory.posted
    memory = {
      ...memory,
      posted: memory.posted.filter((listing) => listing.id !== id),
      savedIds: memory.savedIds.filter((savedId) => savedId !== id),
      ready: true,
    }
    emit()
    try {
      const response = await fetch(`/api/listings/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: requestHeaders(),
      })
      if (!response.ok) throw new Error("delete")
    } catch {
      memory = { ...memory, posted: previous, ready: true }
      emit()
      toast.error("The board database did not remove that ad.")
    }
  })()
}

function toggleSaved(id: string) {
  void (async () => {
    await ensureLoaded()
    const previous = memory.savedIds
    const savedIds = previous.includes(id) ? previous.filter((savedId) => savedId !== id) : [id, ...previous]
    memory = { ...memory, savedIds, ready: true }
    emit()
    try {
      const response = await fetch("/api/saves", {
        method: "POST",
        headers: requestHeaders(),
        body: JSON.stringify({ listingId: id }),
      })
      if (!response.ok) throw new Error("save")
      const payload = (await response.json()) as { savedIds?: unknown }
      const next = parseBoardState({ posted: [], savedIds: payload.savedIds, messages: [] }).savedIds
      memory = { ...memory, savedIds: next, ready: true }
      emit()
    } catch {
      memory = { ...memory, savedIds: previous, ready: true }
      emit()
      toast.error("Could not update saved ads.")
    }
  })()
}

async function sendMessage(listingId: string, body: string): Promise<StoreResult> {
  await ensureLoaded()
  try {
    const response = await fetch("/api/messages", {
      method: "POST",
      headers: requestHeaders(),
      body: JSON.stringify({ listingId, body }),
    })
    if (!response.ok) return { ok: false, reason: await readFailure(response, "The board database did not store the message.") }
    const payload = (await response.json()) as { messages?: unknown }
    const messages = parseBoardState({ posted: [], savedIds: [], messages: payload.messages }).messages
    memory = { ...memory, messages, ready: true }
    emit()
    return { ok: true }
  } catch {
    return { ok: false, reason: "The board database did not store the message." }
  }
}

function markThreadRead(listingId: string) {
  if (!memory.messages.some((message) => message.listingId === listingId && !message.read)) return
  const previous = memory.messages
  const messages: BoardMessage[] = memory.messages.map((message) =>
    message.listingId === listingId ? { ...message, read: true } : message,
  )
  memory = { ...memory, messages, ready: true }
  emit()
  void (async () => {
    try {
      const response = await fetch("/api/messages", {
        method: "PATCH",
        headers: requestHeaders(),
        body: JSON.stringify({ listingId }),
      })
      if (!response.ok) throw new Error("read")
    } catch {
      memory = { ...memory, messages: previous, ready: true }
      emit()
    }
  })()
}

type MarketplaceContextValue = {
  ready: boolean
  listings: Listing[]
  savedIds: string[]
  messages: BoardMessage[]
  isSaved: (id: string) => boolean
  toggleSaved: (id: string) => void
  addListing: (listing: Listing) => Promise<StoreResult>
  updateListing: (listing: Listing) => Promise<StoreResult>
  removeListing: (id: string) => void
  sendMessage: (listingId: string, body: string) => Promise<StoreResult>
  markThreadRead: (listingId: string) => void
}

const MarketplaceContext = createContext<MarketplaceContextValue | null>(null)

export function MarketplaceProvider({ children }: { children: React.ReactNode }) {
  const snapshot = useSyncExternalStore(subscribe, readSnapshot, getServerSnapshot)
  const listings = useMemo(() => [...snapshot.posted, ...seedListings], [snapshot])

  const value = useMemo<MarketplaceContextValue>(
    () => ({
      ready: snapshot.ready,
      listings,
      savedIds: snapshot.savedIds,
      messages: snapshot.messages,
      isSaved: (id: string) => snapshot.savedIds.includes(id),
      toggleSaved,
      addListing,
      updateListing,
      removeListing,
      sendMessage,
      markThreadRead,
    }),
    [listings, snapshot],
  )

  return <MarketplaceContext.Provider value={value}>{children}</MarketplaceContext.Provider>
}

export function useMarketplace(): MarketplaceContextValue {
  const context = useContext(MarketplaceContext)
  if (!context) {
    throw new Error("useMarketplace must be used within MarketplaceProvider")
  }
  return context
}
