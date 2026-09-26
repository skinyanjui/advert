"use client"

import { createContext, useContext, useMemo, useSyncExternalStore } from "react"

import { seedListings } from "@/lib/catalog"
import { canonicalCountry } from "@/lib/countries"
import { acceptListing } from "@/lib/listing-rules"
import { isBoardMessage, messageError, sampleReply, type BoardMessage } from "@/lib/messages"
import { isCategoryId, type Listing } from "@/lib/types"

const STORAGE_KEY = "africa-classifieds-v1"
const messageLimit = 200

type StoredState = {
  posted: Listing[]
  savedIds: string[]
  messages: BoardMessage[]
}

const emptyState: StoredState = { posted: [], savedIds: [], messages: [] }

let memory: { raw: string | null; state: StoredState } = {
  raw: null,
  state: emptyState,
}

const listeners = new Set<() => void>()

function emit() {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function parseStored(raw: string | null): StoredState {
  if (!raw) return emptyState
  try {
    const parsed = JSON.parse(raw) as Partial<StoredState>
    const posted = Array.isArray(parsed.posted)
      ? parsed.posted.flatMap((item) => {
          if (!isStoredListing(item)) return []
          const country = canonicalCountry(item.country)
          return country
            ? [{ ...item, country, subcategory: cleanSubcategory(item.subcategory), details: cleanDetails(item.details) }]
            : []
        })
      : []
    const savedIds = Array.isArray(parsed.savedIds)
      ? parsed.savedIds.filter((id): id is string => typeof id === "string")
      : []
    const messages = Array.isArray(parsed.messages) ? parsed.messages.filter(isBoardMessage).slice(-messageLimit) : []
    return { posted, savedIds, messages }
  } catch {
    return emptyState
  }
}

function readSnapshot(): StoredState {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw === memory.raw) return memory.state
  const state = parseStored(raw)
  memory = { raw, state }
  return state
}

function getServerSnapshot(): StoredState {
  return emptyState
}

function writeStored(state: StoredState): boolean {
  try {
    const raw = JSON.stringify(state)
    localStorage.setItem(STORAGE_KEY, raw)
    memory = { raw, state }
    emit()
    return true
  } catch {
    return false
  }
}

function subscribeReady() {
  return () => {}
}

function getReadySnapshot() {
  return true
}

function getReadyServerSnapshot() {
  return false
}

function cleanSubcategory(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined
}

function cleanDetails(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined
  const entries = Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].trim().length > 0)
  return entries.length > 0 ? Object.fromEntries(entries) : undefined
}

function isStoredListing(value: unknown): value is Listing {
  if (!value || typeof value !== "object") return false
  const listing = value as Partial<Listing>
  return (
    typeof listing.id === "string" &&
    typeof listing.title === "string" &&
    typeof listing.price === "number" &&
    typeof listing.city === "string" &&
    typeof listing.image === "string" &&
    typeof listing.description === "string" &&
    typeof listing.sellerName === "string" &&
    typeof listing.phone === "string" &&
    isCategoryId(listing.category) &&
    canonicalCountry(typeof listing.country === "string" ? listing.country : undefined) !== undefined
  )
}

type MarketplaceContextValue = {
  ready: boolean
  listings: Listing[]
  savedIds: string[]
  isSaved: (id: string) => boolean
  messages: BoardMessage[]
  toggleSaved: (id: string) => void
  addListing: (listing: Listing) => { ok: true } | { ok: false; reason: string }
  updateListing: (listing: Listing) => { ok: true } | { ok: false; reason: string }
  removeListing: (id: string) => void
  sendMessage: (listingId: string, body: string) => { ok: true } | { ok: false; reason: string }
  markThreadRead: (listingId: string) => void
}

const MarketplaceContext = createContext<MarketplaceContextValue | null>(null)

export function MarketplaceProvider({ children }: { children: React.ReactNode }) {
  const stored = useSyncExternalStore(subscribe, readSnapshot, getServerSnapshot)
  const ready = useSyncExternalStore(subscribeReady, getReadySnapshot, getReadyServerSnapshot)
  const listings = useMemo(() => [...stored.posted, ...seedListings], [stored])

  const value = useMemo<MarketplaceContextValue>(() => {
    return {
      ready,
      listings,
      savedIds: stored.savedIds,
      messages: stored.messages,
      isSaved: (id: string) => stored.savedIds.includes(id),
      toggleSaved: (id: string) => {
        const current = readSnapshot()
        const savedIds = current.savedIds.includes(id)
          ? current.savedIds.filter((savedId) => savedId !== id)
          : [id, ...current.savedIds]
        writeStored({ posted: current.posted, savedIds, messages: current.messages })
      },
      addListing: (listing: Listing) => {
        const accepted = acceptPosted(listing)
        if (!accepted.ok) return accepted
        const current = readSnapshot()
        const posted = [accepted.listing, ...current.posted.filter((item) => item.id !== accepted.listing.id)]
        const saved = writeStored({ posted, savedIds: current.savedIds, messages: current.messages })
        if (!saved) {
          return { ok: false, reason: "This browser could not store the ad. Try a smaller photo." }
        }
        return { ok: true }
      },
      updateListing: (listing: Listing) => {
        const accepted = acceptPosted(listing)
        if (!accepted.ok) return accepted
        const current = readSnapshot()
        if (!current.posted.some((item) => item.id === accepted.listing.id)) {
          return { ok: false, reason: "This ad is no longer on this browser." }
        }
        const posted = current.posted.map((item) => (item.id === accepted.listing.id ? accepted.listing : item))
        const saved = writeStored({ posted, savedIds: current.savedIds, messages: current.messages })
        if (!saved) {
          return { ok: false, reason: "This browser could not store the ad. Try a smaller photo." }
        }
        return { ok: true }
      },
      removeListing: (id: string) => {
        const current = readSnapshot()
        writeStored({
          posted: current.posted.filter((listing) => listing.id !== id),
          savedIds: current.savedIds.filter((savedId) => savedId !== id),
          messages: current.messages,
        })
      },
      sendMessage: (listingId: string, body: string) => {
        const text = body.trim()
        const error = messageError(text)
        if (error) return { ok: false, reason: error }
        const current = readSnapshot()
        const listing = [...current.posted, ...seedListings].find((item) => item.id === listingId)
        if (!listing) return { ok: false, reason: "That listing is no longer on the board." }
        if (listing.mine) return { ok: false, reason: "This is your ad." }
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
        const saved = writeStored({
          posted: current.posted,
          savedIds: current.savedIds,
          messages: [...current.messages, yours, reply].slice(-messageLimit),
        })
        if (!saved) return { ok: false, reason: "This browser could not store the message." }
        return { ok: true }
      },
      markThreadRead: (listingId: string) => {
        const current = readSnapshot()
        if (!current.messages.some((message) => message.listingId === listingId && !message.read)) return
        writeStored({
          posted: current.posted,
          savedIds: current.savedIds,
          messages: current.messages.map((message) =>
            message.listingId === listingId ? { ...message, read: true } : message,
          ),
        })
      },
    }
  }, [listings, ready, stored])

  return <MarketplaceContext.Provider value={value}>{children}</MarketplaceContext.Provider>
}

function acceptPosted(listing: Listing): { ok: true; listing: Listing } | { ok: false; reason: string } {
  if (seedListings.some((item) => item.id === listing.id)) {
    return { ok: false, reason: "That listing is already on the board." }
  }
  return acceptListing(listing)
}

export function useMarketplace(): MarketplaceContextValue {
  const context = useContext(MarketplaceContext)
  if (!context) {
    throw new Error("useMarketplace must be used within MarketplaceProvider")
  }
  return context
}
