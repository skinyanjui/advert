"use client"

import { createContext, useContext, useMemo, useSyncExternalStore } from "react"

import { seedListings } from "@/lib/catalog"
import { isCategoryId, isCountryId, type Listing } from "@/lib/types"

const STORAGE_KEY = "africa-classifieds-v1"

type StoredState = {
  posted: Listing[]
  savedIds: string[]
}

const emptyState: StoredState = { posted: [], savedIds: [] }

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
    const posted = Array.isArray(parsed.posted) ? parsed.posted.filter(isStoredListing) : []
    const savedIds = Array.isArray(parsed.savedIds)
      ? parsed.savedIds.filter((id): id is string => typeof id === "string")
      : []
    return { posted, savedIds }
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
    isCountryId(listing.country)
  )
}

type MarketplaceContextValue = {
  ready: boolean
  listings: Listing[]
  savedIds: string[]
  isSaved: (id: string) => boolean
  toggleSaved: (id: string) => void
  addListing: (listing: Listing) => { ok: true } | { ok: false; reason: string }
  removeListing: (id: string) => void
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
      isSaved: (id: string) => stored.savedIds.includes(id),
      toggleSaved: (id: string) => {
        const current = readSnapshot()
        const savedIds = current.savedIds.includes(id)
          ? current.savedIds.filter((savedId) => savedId !== id)
          : [id, ...current.savedIds]
        writeStored({ posted: current.posted, savedIds })
      },
      addListing: (listing: Listing) => {
        const current = readSnapshot()
        const posted = [listing, ...current.posted.filter((item) => item.id !== listing.id)]
        const saved = writeStored({ posted, savedIds: current.savedIds })
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
        })
      },
    }
  }, [listings, ready, stored])

  return <MarketplaceContext.Provider value={value}>{children}</MarketplaceContext.Provider>
}

export function useMarketplace(): MarketplaceContextValue {
  const context = useContext(MarketplaceContext)
  if (!context) {
    throw new Error("useMarketplace must be used within MarketplaceProvider")
  }
  return context
}
