import type { ProfileUpdateInput } from "@/lib/profile"

export function profilePatchFromUnknown(value: unknown): ProfileUpdateInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {}
  const body = value as Record<string, unknown>
  const nullableString = (key: string) =>
    Object.prototype.hasOwnProperty.call(body, key) &&
    (typeof body[key] === "string" || body[key] === null)
      ? body[key] as string | null
      : undefined

  return {
    ...(Object.prototype.hasOwnProperty.call(body, "displayName") ? { displayName: nullableString("displayName") } : {}),
    ...(Object.prototype.hasOwnProperty.call(body, "city") ? { city: nullableString("city") } : {}),
    ...(Object.prototype.hasOwnProperty.call(body, "countryCode") ? { countryCode: nullableString("countryCode") } : {}),
    ...(Object.prototype.hasOwnProperty.call(body, "avatarUrl") ? { avatarUrl: nullableString("avatarUrl") } : {}),
    ...(Object.prototype.hasOwnProperty.call(body, "phone") ? { phone: nullableString("phone") } : {}),
    ...(Object.prototype.hasOwnProperty.call(body, "language") ? { language: nullableString("language") } : {}),
    ...(Object.prototype.hasOwnProperty.call(body, "currency") ? { currency: nullableString("currency") } : {}),
  }
}

export function stableOptionId(fieldId: string, label: string): string {
  const value = label.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  return `${fieldId}:${value || "option"}`
}
