"use client"

import { PRIVACY_VERSION, TERMS_VERSION } from "@/lib/legal"

const TERMS_INTENT_KEY = "africa-classifieds-terms-intent"

type TermsIntent = {
  termsVersion: string
  privacyVersion: string
}

export function rememberTermsIntent(): void {
  if (typeof window === "undefined") return
  const intent: TermsIntent = {
    termsVersion: TERMS_VERSION,
    privacyVersion: PRIVACY_VERSION,
  }
  try {
    sessionStorage.setItem(TERMS_INTENT_KEY, JSON.stringify(intent))
  } catch {
    // sessionStorage may be unavailable; sign-in still proceeds.
  }
}

export function hasTermsIntent(): boolean {
  if (typeof window === "undefined") return false
  try {
    const raw = sessionStorage.getItem(TERMS_INTENT_KEY)
    if (!raw) return false
    const parsed = JSON.parse(raw) as Partial<TermsIntent>
    return parsed.termsVersion === TERMS_VERSION && parsed.privacyVersion === PRIVACY_VERSION
  } catch {
    return false
  }
}

export function clearTermsIntent(): void {
  if (typeof window === "undefined") return
  try {
    sessionStorage.removeItem(TERMS_INTENT_KEY)
  } catch {
    // ignore
  }
}

/** POST /api/terms when the sign-in checkbox intent is present. Best-effort. */
export async function recordPendingTermsAcceptance(
  context: "signup" | "reaccept" = "signup",
): Promise<boolean> {
  if (!hasTermsIntent() && context === "signup") return false
  try {
    const response = await fetch("/api/terms", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ context }),
    })
    if (response.ok) {
      clearTermsIntent()
      return true
    }
  } catch {
    // best-effort after sign-in
  }
  return false
}

export const TERMS_REACCEPT_EVENT = "africa-classifieds-terms-reaccept"

export function requestTermsReaccept(): void {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event(TERMS_REACCEPT_EVENT))
}
