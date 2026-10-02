import { createHmac, timingSafeEqual } from "node:crypto"

/** Verify the original body before parsing; reject replayed delivery timestamps. */
export function verifyStripeSignature(body: string, header: string, secret: string, now = Date.now()): boolean {
  const fields = header.split(",").map(part => part.trim().split("="))
  const timestamp = fields.find(([key]) => key === "t")?.[1]
  if (!timestamp || !/^\d+$/.test(timestamp) || Math.abs(now / 1000 - Number(timestamp)) > 300) return false
  const expected = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest()
  return fields.some(([key, value]) => key === "v1" && /^[a-f0-9]{64}$/.test(value ?? "") && timingSafeEqual(expected, Buffer.from(value, "hex")))
}
