/**
 * Pure decision helper for /auth/callback so we don't double-exchange a PKCE code
 * after detectSessionInUrl has already consumed the verifier.
 */
export type AuthCallbackDecision =
  | { action: "succeed" }
  | { action: "exchange-code"; code: string }
  | { action: "set-session"; accessToken: string; refreshToken: string }
  | { action: "fail"; kind: "device" | "link" }

export function decideAuthCallback(input: {
  hasSession: boolean
  code: string | null
  accessToken: string | null
  refreshToken: string | null
  errorDescription: string | null
  goingToReset: boolean
}): AuthCallbackDecision {
  if (input.errorDescription) {
    return { action: "fail", kind: input.goingToReset ? "device" : "link" }
  }
  if (input.hasSession) {
    return { action: "succeed" }
  }
  if (input.code) {
    return { action: "exchange-code", code: input.code }
  }
  if (input.accessToken && input.refreshToken) {
    return {
      action: "set-session",
      accessToken: input.accessToken,
      refreshToken: input.refreshToken,
    }
  }
  return { action: "fail", kind: input.goingToReset ? "device" : "link" }
}
