export const contactMethods = {
  message: {
    id: "message",
    requiresAuthentication: false,
    requiresPhone: false,
    sellerOptInRequired: false,
    analyticsEvent: "message_start",
  },
  whatsapp: {
    id: "whatsapp",
    requiresAuthentication: true,
    requiresPhone: true,
    sellerOptInRequired: true,
    analyticsEvent: "whatsapp_click",
  },
  text: {
    id: "text",
    requiresAuthentication: true,
    requiresPhone: true,
    sellerOptInRequired: true,
    analyticsEvent: "sms_click",
  },
  call: {
    id: "call",
    requiresAuthentication: true,
    requiresPhone: true,
    sellerOptInRequired: true,
    analyticsEvent: "phone_click",
  },
} as const

export type ContactMethodId = keyof typeof contactMethods
