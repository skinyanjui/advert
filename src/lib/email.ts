import "server-only"

import { siteEmailFrom } from "@/lib/site"

export type OutboundEmail = {
  to: string
  subject: string
  text: string
  html?: string
}

export type EmailSendResult =
  | { ok: true; provider: "resend" | "noop" }
  | { ok: false; reason: string }

/**
 * Pluggable outbound email. Uses Resend when RESEND_API_KEY is set;
 * otherwise succeeds as a no-op so cron stays safe without a provider.
 */
export async function sendEmail(message: OutboundEmail): Promise<EmailSendResult> {
  const key = process.env.RESEND_API_KEY?.trim()
  if (!key) {
    console.info("[email] skipped (RESEND_API_KEY unset)", message.to, message.subject)
    return { ok: true, provider: "noop" }
  }

  const from = process.env.RESEND_FROM_EMAIL?.trim() || siteEmailFrom()
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        authorization: `Bearer ${key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
        html: message.html ?? message.text.replace(/\n/g, "<br/>"),
      }),
    })
    if (!response.ok) {
      const body = await response.text()
      return { ok: false, reason: body.slice(0, 200) || "Resend rejected the message." }
    }
    return { ok: true, provider: "resend" }
  } catch {
    return { ok: false, reason: "Could not reach the email provider." }
  }
}
