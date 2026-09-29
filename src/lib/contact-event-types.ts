export const contactEventTypes = [
  "listing_view",
  "whatsapp_click",
  "phone_click",
  "sms_click",
  "message_start",
] as const

export type ContactEventType = (typeof contactEventTypes)[number]

export function isContactEventType(value: unknown): value is ContactEventType {
  return typeof value === "string" && (contactEventTypes as readonly string[]).includes(value)
}

export function isTrackableListingId(value: unknown): value is string {
  return typeof value === "string" && /^ad-[a-zA-Z0-9-]{1,64}$/.test(value)
}
