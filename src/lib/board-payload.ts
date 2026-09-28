import { canonicalCountry } from "@/lib/countries"
import { isBoardMessage, type BoardMessage } from "@/lib/messages"
import { normalizeListingPhotos } from "@/lib/photos"
import { isListingStatus } from "@/lib/listing-status"
import { isCategoryId, type Listing } from "@/lib/types"

export type BoardState = {
  posted: Listing[]
  savedIds: string[]
  messages: BoardMessage[]
}

export const emptyBoard: BoardState = { posted: [], savedIds: [], messages: [] }

export function parseBoardState(value: unknown): BoardState {
  if (!value || typeof value !== "object") return emptyBoard
  const parsed = value as Partial<BoardState>
  const posted = Array.isArray(parsed.posted)
    ? parsed.posted.flatMap((item) => {
        const listing = cleanListing(item)
        return listing ? [listing] : []
      })
    : []
  const savedIds = Array.isArray(parsed.savedIds)
    ? parsed.savedIds.filter((id): id is string => typeof id === "string" && id.length > 0 && id.length <= 80)
    : []
  const messages = Array.isArray(parsed.messages) ? parsed.messages.filter(isBoardMessage).slice(-200) : []
  return { posted, savedIds, messages }
}

export function cleanListing(value: unknown): Listing | undefined {
  if (!isStoredListing(value)) return undefined
  const country = canonicalCountry(value.country)
  if (!country) return undefined
  const images = normalizeListingPhotos(value.images, value.image)
  const status = isListingStatus(value.status) ? value.status : undefined
  const sold = status === "sold" || value.sold === true ? true : undefined
  return {
    ...value,
    country,
    image: images[0] ?? value.image,
    images: images.length > 1 ? images : images.length === 1 ? images : undefined,
    subcategory: cleanText(value.subcategory),
    details: cleanDetails(value.details),
    currency: cleanText(value.currency),
    priceSuffix: cleanText(value.priceSuffix),
    timezone: cleanText(value.timezone),
    postedAt: cleanText(value.postedAt),
    meta: cleanText(value.meta),
    status,
    sold,
    soldAt: sold ? cleanText(value.soldAt) : undefined,
    expiresAt: cleanText(value.expiresAt),
    hidden: value.hidden === true ? true : undefined,
    mine: value.mine === true ? true : undefined,
    sponsored: value.sponsored === true ? true : undefined,
    sponsoredLocked: value.sponsoredLocked === true ? true : undefined,
  }
}

function isStoredListing(value: unknown): value is Listing {
  if (!value || typeof value !== "object") return false
  const listing = value as Partial<Listing>
  return (
    typeof listing.id === "string" &&
    typeof listing.title === "string" &&
    typeof listing.price === "number" &&
    Number.isFinite(listing.price) &&
    typeof listing.city === "string" &&
    typeof listing.image === "string" &&
    typeof listing.description === "string" &&
    typeof listing.sellerName === "string" &&
    typeof listing.phone === "string" &&
    typeof listing.condition === "string" &&
    typeof listing.hoursAgo === "number" &&
    isCategoryId(listing.category) &&
    canonicalCountry(typeof listing.country === "string" ? listing.country : undefined) !== undefined
  )
}

function cleanText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined
}

function cleanDetails(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined
  const entries = Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].trim().length > 0)
  return entries.length > 0 ? Object.fromEntries(entries) : undefined
}
