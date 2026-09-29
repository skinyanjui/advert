import { NextResponse } from "next/server"

import { recordWhatsAppAccountUpdate } from "@/lib/whatsapp-platform-store"
import { validWhatsAppWebhookSignature, whatsappAccountUpdates } from "@/lib/whatsapp-webhook"

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
  if (!validWhatsAppWebhookSignature(raw, signature, secret)) {
    return new NextResponse("Invalid signature.", { status: 401 })
  }

  let body: unknown
  try {
    body = JSON.parse(raw)
  } catch {
    return new NextResponse("Invalid payload.", { status: 400 })
  }

  const updates = whatsappAccountUpdates(body)
  try {
    for (const update of updates) {
      await recordWhatsAppAccountUpdate(update.wabaId, update.value)
    }
  } catch (error) {
    console.error("Could not process WhatsApp account update", error)
    return new NextResponse("Could not process webhook.", { status: 500 })
  }

  return NextResponse.json({ ok: true, processed: updates.length })
}
