/** Draft legal document versions. Bump when Terms or Privacy text changes. */
export const TERMS_VERSION = "2026-09-28-draft"
export const PRIVACY_VERSION = "2026-09-28-draft"

export const LEGAL_EFFECTIVE_DATE = "2026-09-28"

/** Human-readable prohibited categories aligned with listing-rules refusals. */
export const PROHIBITED_ITEM_SUMMARY = [
  "Illegal drugs (including cocaine, heroin, fentanyl, and methamphetamine)",
  "Weapons such as AK-47s and grenades",
  "Human trafficking",
  "Child sexual exploitation material",
] as const

export const TERMS_ACCEPTANCE_CONTEXTS = ["signup", "reaccept"] as const
export type TermsAcceptanceContext = (typeof TERMS_ACCEPTANCE_CONTEXTS)[number]

export function isTermsAcceptanceContext(value: string): value is TermsAcceptanceContext {
  return (TERMS_ACCEPTANCE_CONTEXTS as readonly string[]).includes(value)
}

/** Returned with HTTP 428 when the user must accept updated Terms. */
export const TERMS_OUTDATED_MESSAGE = "Accept the updated Terms to continue."
