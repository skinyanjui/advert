import "server-only"

import { platformMessageAllowed, type WhatsAppMessageClass } from "@/lib/whatsapp-platform-policy"
import { getWhatsAppPlatformStatus } from "@/lib/whatsapp-platform-store"

export async function assertWhatsAppPlatformSendAllowed(
  wabaId: string,
  messageClass: WhatsAppMessageClass,
): Promise<void> {
  const status = await getWhatsAppPlatformStatus(wabaId)
  if (!platformMessageAllowed(status, messageClass)) {
    throw new Error(
      `WhatsApp Business Platform sending is blocked for ${wabaId} (${status?.state ?? "unknown"}).`,
    )
  }
}
