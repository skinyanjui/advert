import { policyVersions } from "@/lib/policy-versions"

export const WHATSAPP_CONSENT_VERSION = policyVersions.whatsappListingRepliesConsent

export const WHATSAPP_CONSENT_SCOPE = "listing_replies"

export function whatsappConsentStatement(sellerName: string, listingTitle: string): string {
  return `I agree to receive WhatsApp messages from ${sellerName} about “${listingTitle}”. This does not include unrelated marketing.`
}
