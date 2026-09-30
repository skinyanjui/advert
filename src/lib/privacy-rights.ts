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

export const PRIVACY_INTERNAL_TARGET_DAYS = 28

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

function addUtcBusinessDays(from: Date, businessDays: number): Date {
  const due = new Date(from)
  let added = 0
  while (added < businessDays) {
    due.setUTCDate(due.getUTCDate() + 1)
    const day = due.getUTCDay()
    if (day !== 0 && day !== 6) added += 1
  }
  return due
}

export function privacyDueAt(
  jurisdiction: PrivacyJurisdiction,
  requestType: PrivacyRequestType,
  from = new Date(),
): string {
  const fastCaliforniaRequest =
    jurisdiction === "california" &&
    (requestType === "opt_out" || requestType === "limit_sensitive")

  if (fastCaliforniaRequest) {
    return addUtcBusinessDays(from, 15).toISOString()
  }

  const due = new Date(from)
  due.setUTCDate(due.getUTCDate() + PRIVACY_INTERNAL_TARGET_DAYS)
  return due.toISOString()
}
