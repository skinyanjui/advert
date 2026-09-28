import "server-only"

import { boardDb } from "@/lib/board-db"
import {
  PRIVACY_VERSION,
  TERMS_VERSION,
  isTermsAcceptanceContext,
  type TermsAcceptanceContext,
} from "@/lib/legal"
import { getTermsStatus } from "@/lib/terms-gate"

function isMissingRelationError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false
  const code = error.code ?? ""
  const message = (error.message ?? "").toLowerCase()
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    (message.includes("terms_acceptances") && message.includes("does not exist")) ||
    message.includes("could not find the table")
  )
}

export function clientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for")
  if (!forwarded) return null
  const first = forwarded.split(",")[0]?.trim()
  return first || null
}

export function clientUserAgent(request: Request): string | null {
  const value = request.headers.get("user-agent")
  return value?.trim() ? value.trim().slice(0, 500) : null
}

export async function recordTermsAcceptance(
  userId: string,
  context: TermsAcceptanceContext,
  meta: { ip: string | null; userAgent: string | null },
): Promise<{ ok: true; alreadyCurrent?: boolean } | { ok: false; reason: string }> {
  if (!isTermsAcceptanceContext(context)) {
    return { ok: false, reason: "Choose a valid acceptance context." }
  }
  try {
    const status = await getTermsStatus(userId)
    if (status.tableMissing) {
      return { ok: true, alreadyCurrent: true }
    }
    if (status.current && context === "signup") {
      return { ok: true, alreadyCurrent: true }
    }
    const { error } = await boardDb().from("terms_acceptances").insert({
      id: crypto.randomUUID(),
      user_id: userId,
      terms_version: TERMS_VERSION,
      privacy_version: PRIVACY_VERSION,
      ip: meta.ip,
      user_agent: meta.userAgent,
      context,
    })
    if (error) {
      if (isMissingRelationError(error)) return { ok: true, alreadyCurrent: true }
      return { ok: false, reason: error.message }
    }
    return { ok: true }
  } catch (error) {
    if (isMissingRelationError(error as { code?: string; message?: string })) {
      return { ok: true, alreadyCurrent: true }
    }
    return { ok: false, reason: "Could not record Terms acceptance." }
  }
}
