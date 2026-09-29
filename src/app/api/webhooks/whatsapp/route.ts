import { createHmac, timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"

import { recordWhatsAppAccountUpdate } from "@/lib/whatsapp-platform-store"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const mode = url.searchParams.get("hub.mode")
  const token = url.searchParams.get("hub.verify_token")
  const challenge = url.searchParams.get("hub.challenge")
  const expected = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN

  if (!expected) return new NextResponse("Webhook not configured", { status: 503 })
  if (mode !== "subscribe" || token !== expected || !challenge) {
    return new NextResponse("Verification failed", { status: 403 })
  }
  return new NextResponse(challenge, { status: 200 })
}

export async function POST(request: Request) {
  const secret = process.env.META_APP_SECRET
  if (!secret) return new NextResponse("Webhook not configured", { status: 503 })

  const raw = await request.text()
  if (!validSignature(raw, request.headers.get("x-hub-signature-256"), secret)) {
    return new NextResponse("Invalid signature", { status: 401 })
  }

  let payload: unknown
  try {
    payload = JSON.parse(raw)
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 })
  }

  const changes = accountUpdates(payload)
  for (const change of changes) {
    try {
      await recordWhatsAppAccountUpdate(change.wabaId, change.value)
    } catch (error) {
      console.error("Could not persist WhatsApp account_update", error)
      return new NextResponse("Could not persist webhook", { status: 500 })
    }
  }

  return new NextResponse("EVENT_RECEIVED", { status: 200 })
}

function validSignature(body: string, header: string | null, secret: string): boolean {
  if (!header?.startsWith("sha256=")) return false
  const supplied = header.slice("sha256=".length)
  if (!/^[a-f0-9]{64}$/i.test(supplied)) return false
  const expected = createHmac("sha256", secret).update(body).digest("hex")
  return timingSafeEqual(Buffer.from(supplied, "hex"), Buffer.from(expected, "hex"))
}

function accountUpdates(payload: unknown): Array<{ wabaId: string; value: unknown }> {
  if (!payload || typeof payload !== "object") return []
  const entries = Array.isArray((payload as { entry?: unknown }).entry)
    ? ((payload as { entry: unknown[] }).entry)
    : []
  const result: Array<{ wabaId: string; value: unknown }> = []

  for (const entry of entries) {
    if (!entry || typeof entry !== "object") continue
    const entryId = typeof (entry as { id?: unknown }).id === "string" ? (entry as { id: string }).id : ""
    const changes = Array.isArray((entry as { changes?: unknown }).changes)
      ? (entry as { changes: unknown[] }).changes
      : []
    for (const item of changes) {
      if (!item || typeof item !== "object") continue
      if ((item as { field?: unknown }).field !== "account_update") continue
      const value = (item as { value?: unknown }).value
      const valueObject = value && typeof value === "object" ? (value as Record<string, unknown>) : {}
      const candidate =
        typeof valueObject.waba_id === "string"
          ? valueObject.waba_id
          : typeof valueObject.id === "string"
            ? valueObject.id
            : entryId
      if (candidate) result.push({ wabaId: candidate, value })
    }
  }
  return result
}
