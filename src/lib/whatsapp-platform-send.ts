import "server-only"

import { whatsappSendAllowed, type WhatsAppMessageClass } from "@/lib/whatsapp-platform-policy"
import { getWhatsAppPlatformStatus } from "@/lib/whatsapp-platform-store"

export async function assertWhatsAppPlatformSendAllowed(
  wabaId: string,
  messageClass: WhatsAppMessageClass,
): Promise<void> {
  const status = await getWhatsAppPlatformStatus(wabaId)
  const decision = whatsappSendAllowed(status, messageClass)
  if (!decision.allowed) {
    throw new Error(decision.reason)
  }
}
