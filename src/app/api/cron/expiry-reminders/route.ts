import { NextResponse } from "next/server"

import { expireContactEventsIfAvailable } from "@/lib/contact-leads-store"
import { expirePromotionsIfAvailable } from "@/lib/promotion-store"
import { sendExpiryReminders } from "@/lib/board-store"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return false
  const header = request.headers.get("authorization")
  return header === `Bearer ${secret}`
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, reason: "Unauthorized" }, { status: 401 })
  }
  try {
    const contactEventsDeleted = await expireContactEventsIfAvailable()
    const featuredExpired = await expirePromotionsIfAvailable()
    const summary = await sendExpiryReminders()
    return NextResponse.json({ ok: true, ...summary, featuredExpired, contactEventsDeleted })
  } catch {
    return NextResponse.json({ ok: false, reason: "Expiry reminder run failed." }, { status: 500 })
  }
}
