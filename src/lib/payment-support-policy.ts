import { z } from "zod"
import { marketplacePolicy } from "@/lib/marketplace-policy"

// Mailbox verification is operational evidence, never a claim about response times.
export const paymentSupportPolicy = marketplacePolicy.paymentSupport
export const paymentSupportActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("send") }),
  z.object({ action: z.literal("confirm"), code: z.string().trim().regex(/^[a-f0-9]{64}$/i).transform(value => value.toLowerCase()) }),
])

export function validSupportEmail(value?: string): string | undefined {
  const parsed = z.email().safeParse(value?.trim().toLowerCase())
  if (!parsed.success || /(?:^|\.)(?:example\.(?:com|org|net)|localhost|invalid)$/.test(parsed.data.split("@")[1])) return undefined
  return parsed.data
}

export function supportVerificationCurrent(verifiedAt: string | null | undefined, now = Date.now()): boolean {
  const time = Date.parse(verifiedAt ?? "")
  return Number.isFinite(time) && time <= now && now - time < paymentSupportPolicy.verificationDays * 86400000
}
