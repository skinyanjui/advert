import { canonicalCountry } from "@/lib/countries"
import { isBoardMessage, type BoardMessage } from "@/lib/messages"
import { normalizeListingPhotos } from "@/lib/photos"
import { isListingStatus } from "@/lib/listing-status"
import { listingRecordSchema } from "@/lib/runtime-contracts"
import { type Listing } from "@/lib/types"

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
  const parsed = listingRecordSchema.safeParse(value)
  if (!parsed.success) return undefined
  const record = parsed.data
  const country = canonicalCountry(record.country)
  if (!country) return undefined
  const images = normalizeListingPhotos(record.images, record.image)
  const status = isListingStatus(record.status) ? record.status : undefined
  const sold = status === "sold" || record.sold === true ? true : undefined
  return {
    ...record,
    country,
    image: images[0] ?? record.image,
    images: images.length > 1 ? images : images.length === 1 ? images : undefined,
    subcategory: cleanText(record.subcategory),
    details: cleanDetails(record.details),
    currency: cleanText(record.currency),
    priceSuffix: cleanText(record.priceSuffix),
    timezone: cleanText(record.timezone),
    locationDetail: cleanText(record.locationDetail),
    locationPrecision: record.locationPrecision === "specific" ? "specific" : record.locationPrecision === "city" ? "city" : undefined,
    latitude: typeof record.latitude === "number" && Number.isFinite(record.latitude) ? record.latitude : undefined,
    longitude: typeof record.longitude === "number" && Number.isFinite(record.longitude) ? record.longitude : undefined,
    postedAt: cleanText(record.postedAt),
    meta: cleanText(record.meta),
    status,
    sold,
    soldAt: sold ? cleanText(record.soldAt) : undefined,
    expiresAt: cleanText(record.expiresAt),
    hidden: record.hidden === true ? true : undefined,
    mine: record.mine === true ? true : undefined,
    sponsored: record.sponsored === true ? true : undefined,
    sponsoredLocked: record.sponsoredLocked === true ? true : undefined,
    fairAccessAttested: record.fairAccessAttested === true ? true : undefined,
    fairAccessAttestationVersion:
      record.fairAccessAttested === true ? cleanText(record.fairAccessAttestationVersion) : undefined,
    contactWhatsApp: record.contactWhatsApp === true,
    contactPhone: record.contactPhone === true,
  }
}

function cleanText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined
}

function cleanDetails(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined
  const entries = Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].trim().length > 0)
  return entries.length > 0 ? Object.fromEntries(entries) : undefined
}
