import { contactMethods } from "@/lib/contact-methods"
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
  const activeConversation = status === "active" && !mine
  const directBase = activeConversation && signedIn && !sample && hasPhone

  return {
    message: activeConversation && !contactMethods.message.requiresPhone,
    whatsapp: directBase && contactMethods.whatsapp.sellerOptInRequired && whatsappEnabled,
    text: directBase && contactMethods.text.sellerOptInRequired && phoneEnabled,
    call: directBase && contactMethods.call.sellerOptInRequired && phoneEnabled,
    closedStatus: !mine && status !== "active" ? status : null,
  }
}
