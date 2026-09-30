"use client"

import { PRIVACY_VERSION, TERMS_VERSION } from "@/lib/legal"

const TERMS_INTENT_KEY = "africa-classifieds-terms-intent"
const TERMS_INTENT_TTL_MS = 60 * 60 * 1000

type TermsIntent = {
  termsVersion: string
  privacyVersion: string
  ageAttested: boolean
  privacyAcknowledged: boolean
  locale: string | null
  savedAt: number
}

export const TERMS_REACCEPT_EVENT = "africa-classifieds-terms-reaccept"
export const TERMS_ACCEPTED_EVENT = "africa-classifieds-terms-accepted"

function readIntent(): TermsIntent | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(TERMS_INTENT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<TermsIntent>
    if (
      typeof parsed.termsVersion !== "string" ||
      typeof parsed.privacyVersion !== "string" ||
      parsed.ageAttested !== true ||
      parsed.privacyAcknowledged !== true ||
      typeof parsed.savedAt !== "number"
    ) {
      return null
    }
    if (Date.now() - parsed.savedAt > TERMS_INTENT_TTL_MS) {
      clearTermsIntent()
      return null
    }
    return {
      termsVersion: parsed.termsVersion,
      privacyVersion: parsed.privacyVersion,
      ageAttested: true,
      privacyAcknowledged: true,
      locale: typeof parsed.locale === "string" ? parsed.locale.slice(0, 16) : null,
      savedAt: parsed.savedAt,
    }
  } catch {
    return null
  }
}

export function rememberTermsIntent(): void {
  if (typeof window === "undefined") return
  const locale =
    document.documentElement.lang?.trim() ||
    navigator.language?.trim() ||
    null
  const intent: TermsIntent = {
    termsVersion: TERMS_VERSION,
    privacyVersion: PRIVACY_VERSION,
    ageAttested: true,
    privacyAcknowledged: true,
    locale: locale ? locale.slice(0, 16) : null,
    savedAt: Date.now(),
  }
  try {
    localStorage.setItem(TERMS_INTENT_KEY, JSON.stringify(intent))
  } catch {
    // localStorage may be unavailable; sign-in still proceeds.
  }
}

export function hasTermsIntent(): boolean {
  const intent = readIntent()
  if (!intent) return false
  return (
    intent.termsVersion === TERMS_VERSION &&
    intent.privacyVersion === PRIVACY_VERSION &&
    intent.ageAttested === true &&
    intent.privacyAcknowledged === true
  )
}

export function clearTermsIntent(): void {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(TERMS_INTENT_KEY)
  } catch {
    // ignore
  }
}

export function notifyTermsAccepted(): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event(TERMS_ACCEPTED_EVENT))
}

/** POST /api/terms when the sign-in checkbox intent is present. Best-effort. */
export async function recordPendingTermsAcceptance(
  context: "signup" | "reaccept" = "signup",
): Promise<boolean> {
  const intent = readIntent()
  if ((!intent || !hasTermsIntent()) && context === "signup") return false
  try {
    const response = await fetch("/api/terms", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        context,
        ageAttested: intent?.ageAttested ?? true,
        privacyAcknowledged: intent?.privacyAcknowledged ?? true,
        locale: intent?.locale ?? null,
      }),
    })
    if (response.ok) {
      clearTermsIntent()
      notifyTermsAccepted()
      return true
    }
  } catch {
    // best-effort after sign-in
  }
  return false
}

export function requestTermsReaccept(): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event(TERMS_REACCEPT_EVENT))
}
