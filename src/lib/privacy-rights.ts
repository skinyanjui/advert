export const privacyJurisdictions = [
  { id: "eu_eea", label: "EU / EEA (GDPR)" },
  { id: "california", label: "California (CCPA / CPRA)" },
  { id: "colorado", label: "Colorado" },
  { id: "oregon", label: "Oregon" },
  { id: "texas", label: "Texas" },
  { id: "kenya", label: "Kenya" },
  { id: "nigeria", label: "Nigeria" },
  { id: "south_africa", label: "South Africa" },
  { id: "ghana", label: "Ghana" },
  { id: "other", label: "Other / not sure" },
] as const

export type PrivacyJurisdiction = (typeof privacyJurisdictions)[number]["id"]

export const privacyRequestTypes = [
  { id: "access", label: "Access my data" },
  { id: "portability", label: "Download / portability" },
  { id: "correction", label: "Correct my data" },
  { id: "deletion", label: "Delete my data" },
  { id: "restriction", label: "Restrict processing" },
  { id: "objection", label: "Object to processing" },
  { id: "opt_out", label: "Opt out of sale, sharing, targeted ads, or profiling" },
  { id: "limit_sensitive", label: "Limit sensitive personal information" },
  { id: "withdraw_consent", label: "Withdraw consent" },
  { id: "appeal", label: "Appeal a privacy decision" },
] as const

export type PrivacyRequestType = (typeof privacyRequestTypes)[number]["id"]

export const privacyRequestStatuses = [
  "verification_required",
  "received",
  "in_progress",
  "completed",
  "denied",
  "appealed",
] as const
export type PrivacyRequestStatus = (typeof privacyRequestStatuses)[number]

export const PRIVACY_INTERNAL_TARGET_DAYS = 30

export function isPrivacyJurisdiction(value: string): value is PrivacyJurisdiction {
  return privacyJurisdictions.some((item) => item.id === value)
}

export function isPrivacyRequestType(value: string): value is PrivacyRequestType {
  return privacyRequestTypes.some((item) => item.id === value)
}

export function privacyRequestTypeLabel(value: PrivacyRequestType): string {
  return privacyRequestTypes.find((item) => item.id === value)?.label ?? value
}

export function privacyJurisdictionLabel(value: PrivacyJurisdiction): string {
  return privacyJurisdictions.find((item) => item.id === value)?.label ?? value
}

export function privacyStatusLabel(value: PrivacyRequestStatus): string {
  if (value === "verification_required") return "Verification required"
  if (value === "in_progress") return "In progress"
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function privacyDueAt(from = new Date()): string {
  const due = new Date(from)
  due.setUTCDate(due.getUTCDate() + PRIVACY_INTERNAL_TARGET_DAYS)
  return due.toISOString()
}
