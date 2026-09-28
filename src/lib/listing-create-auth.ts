/** Shared rule for POST /api/listings create — matches the post form when Auth is on. */
export function createListingAuthError(
  ownerKind: "auth" | "session",
  configured: boolean,
): string | undefined {
  if (configured && ownerKind !== "auth") return "Sign in to post an ad."
  return undefined
}
