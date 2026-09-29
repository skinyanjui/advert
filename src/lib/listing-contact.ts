import type { ListingStatus } from "@/lib/listing-status"

export type ListingContactCapabilities = {
  message: boolean
  whatsapp: boolean
  text: boolean
  call: boolean
  closedStatus: Exclude<ListingStatus, "active"> | null
}

export function listingContactCapabilities({
  status,
  mine,
  signedIn,
  sample,
  hasPhone,
  whatsappEnabled,
  phoneEnabled,
}: {
  status: ListingStatus
  mine: boolean
  signedIn: boolean
  sample: boolean
  hasPhone: boolean
  whatsappEnabled: boolean
  phoneEnabled: boolean
}): ListingContactCapabilities {
  const message = status === "active" && !mine
  const direct = message && signedIn && !sample && hasPhone

  return {
    message,
    whatsapp: direct && whatsappEnabled,
    text: direct && phoneEnabled,
    call: direct && phoneEnabled,
    closedStatus: !mine && status !== "active" ? status : null,
  }
}
