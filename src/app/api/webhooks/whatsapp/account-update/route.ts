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

  if (!expected || mode !== "subscribe" || token !== expected || !challenge) {
    return new NextResponse("Forbidden", { status: 403 })
  }

  return new NextResponse(challenge, { status: 200 })
}

export async function POST(request: Request) {
  const secret = process.env.WHATSAPP_APP_SECRET
  if (!secret) {
    return new NextResponse("Webhook secret is not configured.", { status: 503 })
  }

  const raw = await request.text()
  const signature = request.headers.get("x-hub-signature-256")
  if (!validSignature(raw, signature, secret)) {
    return new NextResponse("Invalid signature.", { status: 401 })
  }

  let body: unknown
  try {
    body = JSON.parse(raw)
  } catch {
    return new NextResponse("Invalid payload.", { status: 400 })
  }

  const updates = accountUpdates(body)
  try {
    for (const update of updates) {
      await recordWhatsAppAccountUpdate(update)
    }
  } catch (error) {
    console.error("Could not process WhatsApp account update", error)
    return new NextResponse("Could not process webhook.", { status: 500 })
  }

  return NextResponse.json({ ok: true, processed: updates.length })
}

function validSignature(raw: string, signature: string | null, secret: string): boolean {
  if (!signature?.startsWith("sha256=")) return false
  const supplied = signature.slice("sha256=".length)
  if (!/^[a-f0-9]{64}$/i.test(supplied)) return false
  const expected = createHmac("sha256", secret).update(raw).digest("hex")
  return timingSafeEqual(Buffer.from(supplied, "hex"), Buffer.from(expected, "hex"))
}

function accountUpdates(body: unknown): Array<{ wabaId: string; value: unknown }> {
  if (!body || typeof body !== "object") return []
  const entries = Array.isArray((body as { entry?: unknown }).entry)
    ? ((body as { entry: unknown[] }).entry)
    : []

  const updates: Array<{ wabaId: string; value: unknown }> = []
  for (const entry of entries) {
    if (!entry || typeof entry !== "object") continue
    const wabaId = typeof (entry as { id?: unknown }).id === "string" ? (entry as { id: string }).id : ""
    if (!wabaId) continue
    const changes = Array.isArray((entry as { changes?: unknown }).changes)
      ? ((entry as { changes: unknown[] }).changes)
      : []
    for (const change of changes) {
      if (!change || typeof change !== "object") continue
      const field = (change as { field?: unknown }).field
      if (field !== "account_update") continue
      updates.push({ wabaId, value: (change as { value?: unknown }).value ?? {} })
    }
  }
  return updates
}
