import { after } from "next/server"

import { fail, ok } from "@/lib/api"
import { boardDb } from "@/lib/board-db"
import { sameOrigin } from "@/lib/board-session"
import { sendEmail } from "@/lib/email"
import { site } from "@/lib/site"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const categories = new Set(["account", "moderation", "safety", "security", "legal", "general"])

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : ""
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail("Invalid request origin.", 403)
  if (Number(request.headers.get("content-length") ?? 0) > 20_000) return fail("Request is too large.", 413)

  let input: Record<string, unknown>
  try { input = await request.json() as Record<string, unknown> }
  catch { return fail("Invalid request body.") }

  const email = text(input.email, 254).toLowerCase()
  const category = text(input.category, 32)
  const subject = text(input.subject, 120)
  const message = text(input.message, 4000)
  const honeypot = text(input.website, 200)

  if (honeypot) return ok({ submitted: true })
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("Enter a valid email address.")
  if (!categories.has(category)) return fail("Choose a support category.")
  if (subject.length < 3) return fail("Enter a short subject.")
  if (message.length < 10) return fail("Tell us enough to investigate the issue.")

  const db = boardDb()
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count, error: countError } = await db
    .from("support_requests")
    .select("id", { count: "exact", head: true })
    .eq("email", email)
    .gte("created_at", oneHourAgo)
  if (countError) return fail("Support intake is temporarily unavailable.", 503)
  if ((count ?? 0) >= 5) return fail("Too many support requests. Try again later.", 429)

  const { data, error } = await db.from("support_requests").insert({
    email,
    category,
    subject,
    message,
  }).select("id,created_at").single()
  if (error) return fail("Support intake is temporarily unavailable.", 503)

  if (site.supportEmail) {
    const requestId = String(data.id)
    after(async () => {
      const result = await sendEmail({
        to: site.supportEmail!,
        subject: `[${category.toUpperCase()}] ${subject}`,
        text: `Support request ${requestId}\nFrom: ${email}\nCategory: ${category}\n\n${message}`,
        idempotencyKey: `support-request-${requestId}`,
      })
      if (!result.ok) console.error("Support notification delivery failed", { requestId, reason: result.reason })
    })
  }

  return ok({
    submitted: true,
    requestId: String(data.id),
    receivedAt: data.created_at,
    expectation: category === "security" || category === "safety"
      ? "Urgent safety and security reports are prioritized in the operator queue."
      : "Support will review the request in the operator queue.",
  })
}
