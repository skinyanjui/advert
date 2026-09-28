"use client"

import { createContext, useContext, useMemo, useSyncExternalStore } from "react"
import { toast } from "sonner"

import { parseBoardState, type BoardState } from "@/lib/board-payload"
import { seedListings } from "@/lib/catalog"
import type { BoardMessage } from "@/lib/messages"
import type { Listing } from "@/lib/types"

const legacyKey = "africa-classifieds-v1"
const migratedKey = "africa-classifieds-migrated"

type Snapshot = BoardState & { ready: boolean; admin: boolean }

const emptyState: BoardState = { posted: [], savedIds: [], messages: [] }
const serverSnapshot: Snapshot = { ...emptyState, ready: false, admin: false }

let memory: Snapshot = { ...emptyState, ready: false, admin: false }
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

function requestHeaders(): HeadersInit {
  return { "content-type": "application/json" }
}

function ensureLoaded(): Promise<void> {
  if (memory.ready) return Promise.resolve()
  if (!inflight) inflight = loadBoard()
  return inflight
}

async function loadBoard() {
  try {
    const response = await fetch("/api/board", { headers: requestHeaders(), cache: "no-store" })
    if (!response.ok) throw new Error("board")
    try {
      await migrateLegacy()
    } catch {
      toast.error("Saved ads on this browser could not be moved into the database.")
    }
    const refreshed = await fetch("/api/board", { headers: requestHeaders(), cache: "no-store" })
    if (!refreshed.ok) throw new Error("board")
    const payload: unknown = await refreshed.json()
    const admin =
      typeof payload === "object" &&
      payload !== null &&
      "admin" in payload &&
      (payload as { admin?: unknown }).admin === true
    memory = { ...parseBoardState(payload), ready: true, admin: Boolean(admin) }
  } catch {
    memory = { ...emptyState, ready: true, admin: false }
    toast.error("The board database did not respond. Sample ads are still here.")
  }
  emit()
}

export async function reloadBoard(): Promise<void> {
  memory = { ...memory, ready: false }
  emit()
  inflight = loadBoard()
  await inflight
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

async function removeListing(id: string): Promise<StoreResult> {
  await ensureLoaded()
  const previous = memory.posted
  const previousSaved = memory.savedIds
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
    if (!response.ok) {
      memory = { ...memory, posted: previous, savedIds: previousSaved, ready: true }
      emit()
      return { ok: false, reason: await readFailure(response, "The board database did not remove that ad.") }
    }
    return { ok: true }
  } catch {
    memory = { ...memory, posted: previous, savedIds: previousSaved, ready: true }
    emit()
    return { ok: false, reason: "The board database did not remove that ad." }
  }
}

function restoreListing(id: string, previous: Listing | undefined) {
  if (!previous) return
  memory = {
    ...memory,
    posted: memory.posted.map((item) => (item.id === id ? previous : item)),
    ready: true,
  }
  emit()
}

async function setListingSold(
  id: string,
  sold: boolean,
  resumeTo?: "active" | "paused",
): Promise<StoreResult> {
  await ensureLoaded()
  const previousListing = memory.posted.find((item) => item.id === id)
  const nextStatus = (sold ? "sold" : resumeTo === "paused" ? "paused" : "active") as Listing["status"]
  const optimistic = memory.posted.map((item) =>
    item.id === id
      ? {
          ...item,
          sold: sold ? true : undefined,
          status: nextStatus,
          soldAt: sold ? new Date().toISOString() : undefined,
        }
      : item,
  )
  memory = { ...memory, posted: optimistic, ready: true }
  emit()
  try {
    const response = await fetch(`/api/listings/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: requestHeaders(),
      body: JSON.stringify(resumeTo ? { sold, resumeTo } : { sold }),
    })
    if (!response.ok) {
      restoreListing(id, previousListing)
      return { ok: false, reason: await readFailure(response, "Could not update that ad.") }
    }
    const payload = (await response.json()) as { listing?: unknown }
    const saved = parseBoardState({ posted: [payload.listing], savedIds: [], messages: [] }).posted[0]
    if (!saved) {
      restoreListing(id, previousListing)
      return { ok: false, reason: "That ad could not be read." }
    }
    memory = {
      ...memory,
      posted: memory.posted.map((item) => (item.id === saved.id ? saved : item)),
      ready: true,
    }
    emit()
    return { ok: true }
  } catch {
    restoreListing(id, previousListing)
    return { ok: false, reason: "Could not update that ad." }
  }
}

async function setListingPaused(id: string, paused: boolean): Promise<StoreResult> {
  await ensureLoaded()
  const previousListing = memory.posted.find((item) => item.id === id)
  const optimistic = memory.posted.map((item) =>
    item.id === id
      ? {
          ...item,
          status: (paused ? "paused" : "active") as Listing["status"],
          sold: undefined,
        }
      : item,
  )
  memory = { ...memory, posted: optimistic, ready: true }
  emit()
  try {
    const response = await fetch(`/api/listings/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: requestHeaders(),
      body: JSON.stringify({ paused }),
    })
    if (!response.ok) {
      restoreListing(id, previousListing)
      return { ok: false, reason: await readFailure(response, "Could not update that ad.") }
    }
    const payload = (await response.json()) as { listing?: unknown }
    const saved = parseBoardState({ posted: [payload.listing], savedIds: [], messages: [] }).posted[0]
    if (!saved) {
      restoreListing(id, previousListing)
      return { ok: false, reason: "That ad could not be read." }
    }
    memory = {
      ...memory,
      posted: memory.posted.map((item) => (item.id === saved.id ? saved : item)),
      ready: true,
    }
    emit()
    return { ok: true }
  } catch {
    restoreListing(id, previousListing)
    return { ok: false, reason: "Could not update that ad." }
  }
}

async function renewListing(id: string): Promise<StoreResult> {
  await ensureLoaded()
  try {
    const response = await fetch(`/api/listings/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: requestHeaders(),
      body: JSON.stringify({ renew: true }),
    })
    if (!response.ok) return { ok: false, reason: await readFailure(response, "Could not renew that ad.") }
    const payload = (await response.json()) as { listing?: unknown }
    const saved = parseBoardState({ posted: [payload.listing], savedIds: [], messages: [] }).posted[0]
    if (!saved) return { ok: false, reason: "That ad could not be read." }
    memory = {
      ...memory,
      posted: [saved, ...memory.posted.filter((item) => item.id !== saved.id)],
      ready: true,
    }
    emit()
    return { ok: true }
  } catch {
    return { ok: false, reason: "Could not renew that ad." }
  }
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

async function sendMessage(listingId: string, body: string, conversationId?: string): Promise<StoreResult> {
  await ensureLoaded()
  try {
    const response = await fetch("/api/messages", {
      method: "POST",
      headers: requestHeaders(),
      body: JSON.stringify(conversationId ? { conversationId, body } : { listingId, body }),
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

function markThreadRead(conversationId: string) {
  if (!memory.messages.some((message) => message.conversationId === conversationId && !message.read && !message.fromMe)) {
    return
  }
  const previous = memory.messages
  const messages: BoardMessage[] = memory.messages.map((message) =>
    message.conversationId === conversationId ? { ...message, read: true } : message,
  )
  memory = { ...memory, messages, ready: true }
  emit()
  void (async () => {
    try {
      const response = await fetch("/api/messages", {
        method: "PATCH",
        headers: requestHeaders(),
        body: JSON.stringify({ conversationId }),
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
  admin: boolean
  listings: Listing[]
  savedIds: string[]
  messages: BoardMessage[]
  isSaved: (id: string) => boolean
  toggleSaved: (id: string) => void
  addListing: (listing: Listing) => Promise<StoreResult>
  updateListing: (listing: Listing) => Promise<StoreResult>
  removeListing: (id: string) => Promise<StoreResult>
  setListingSold: (id: string, sold: boolean, resumeTo?: "active" | "paused") => Promise<StoreResult>
  setListingPaused: (id: string, paused: boolean) => Promise<StoreResult>
  renewListing: (id: string) => Promise<StoreResult>
  sendMessage: (listingId: string, body: string, conversationId?: string) => Promise<StoreResult>
  markThreadRead: (conversationId: string) => void
  reloadBoard: () => Promise<void>
}

const MarketplaceContext = createContext<MarketplaceContextValue | null>(null)

export function MarketplaceProvider({ children }: { children: React.ReactNode }) {
  const snapshot = useSyncExternalStore(subscribe, readSnapshot, getServerSnapshot)
  const listings = useMemo(() => [...snapshot.posted, ...seedListings], [snapshot])

  const value = useMemo<MarketplaceContextValue>(
    () => ({
      ready: snapshot.ready,
      admin: snapshot.admin,
      listings,
      savedIds: snapshot.savedIds,
      messages: snapshot.messages,
      isSaved: (id: string) => snapshot.savedIds.includes(id),
      toggleSaved,
      addListing,
      updateListing,
      removeListing,
      setListingSold,
      setListingPaused,
      renewListing,
      sendMessage,
      markThreadRead,
      reloadBoard,
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
