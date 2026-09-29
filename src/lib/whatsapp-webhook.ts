import { createHmac, timingSafeEqual } from "node:crypto"

export function validWhatsAppWebhookSignature(
  raw: string,
  signature: string | null,
  secret: string,
): boolean {
  if (!signature?.startsWith("sha256=")) return false
  const supplied = signature.slice("sha256=".length)
  if (!/^[a-f0-9]{64}$/i.test(supplied)) return false
  const expected = createHmac("sha256", secret).update(raw).digest("hex")
  return timingSafeEqual(Buffer.from(supplied, "hex"), Buffer.from(expected, "hex"))
}

export function whatsappAccountUpdates(
  body: unknown,
): Array<{ wabaId: string; value: unknown }> {
  if (!body || typeof body !== "object") return []

  const entries = Array.isArray((body as { entry?: unknown }).entry)
    ? (body as { entry: unknown[] }).entry
    : []

  const updates: Array<{ wabaId: string; value: unknown }> = []
  for (const entry of entries) {
    if (!entry || typeof entry !== "object") continue
    const wabaId =
      typeof (entry as { id?: unknown }).id === "string"
        ? (entry as { id: string }).id
        : ""
    if (!wabaId) continue

    const changes = Array.isArray((entry as { changes?: unknown }).changes)
      ? (entry as { changes: unknown[] }).changes
      : []

    for (const change of changes) {
      if (!change || typeof change !== "object") continue
      if ((change as { field?: unknown }).field !== "account_update") continue
      updates.push({
        wabaId,
        value: (change as { value?: unknown }).value ?? {},
      })
    }
  }

  return updates
}
