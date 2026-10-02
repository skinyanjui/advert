import "server-only"
import { verifyStripeSignature } from "@/lib/stripe-signature"

export type StripeSession = {
  id: string
  url: string | null
  status: string
  payment_status: string
  amount_total: number | null
  currency: string | null
  payment_intent: string | null
  metadata: { promotion_id?: string }
}

export async function stripeRequest<T>(path: string, body?: URLSearchParams, key?: string): Promise<T> {
  const secret = process.env.STRIPE_SECRET_KEY
  if (!secret) throw new Error("Stripe checkout is not configured.")
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      authorization: `Bearer ${secret}`,
      "Stripe-Version": "2025-02-24.acacia",
      ...(body ? { "content-type": "application/x-www-form-urlencoded" } : {}),
      ...(key ? { "Idempotency-Key": key } : {}),
    },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  })
  if (!response.ok) throw new Error("Stripe did not complete the request. Please retry.")
  return response.json() as Promise<T>
}

export function checkoutBaseUrl(): string {
  const value = process.env.APP_BASE_URL
  if (!value) throw new Error("Checkout return URL is not configured.")
  const url = new URL(value)
  if (url.username || url.password || (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname)))) {
    throw new Error("Checkout return URL must use HTTPS (or local development HTTP).")
  }
  return url.origin
}

export function signedStripeEvent(body: string, header: string) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) throw new Error("Stripe webhook is not configured.")
  if (!verifyStripeSignature(body, header, secret)) return null
  return JSON.parse(body) as { type: string; data: { object: Record<string, unknown> } }
}

export function paidFeaturingConfigured(): boolean {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) return false
  try { checkoutBaseUrl(); return true } catch { return false }
}
