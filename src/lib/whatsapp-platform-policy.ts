
export const whatsappMessageClasses = ["marketing", "utility", "authentication", "service"] as const
export type WhatsAppMessageClass = (typeof whatsappMessageClasses)[number]

export const whatsappEnforcementStates = [
  "healthy",
  "warning",
  "template_restricted",
  "all_messages_restricted",
  "account_locked",
  "disabled",
  "unknown",
] as const

export type WhatsAppEnforcementState = (typeof whatsappEnforcementStates)[number]

export type WhatsAppPlatformStatus = {
  wabaId: string
  state: WhatsAppEnforcementState
  restrictionUntil?: string | null
  policyName?: string | null
  summary?: string | null
  lastEventAt?: string | null
}

export function whatsappSendAllowed(
  status: WhatsAppPlatformStatus,
  messageClass: WhatsAppMessageClass,
  now = Date.now(),
): { allowed: true } | { allowed: false; reason: string } {
  const until = status.restrictionUntil ? Date.parse(status.restrictionUntil) : Number.NaN
  const restrictionExpired = Number.isFinite(until) && until <= now

  if (restrictionExpired && status.state !== "account_locked" && status.state !== "disabled") {
    return { allowed: true }
  }

  if (status.state === "healthy" || status.state === "warning" || status.state === "unknown") {
    return { allowed: true }
  }

  if (status.state === "template_restricted") {
    if (messageClass === "service") return { allowed: true }
    return { allowed: false, reason: "WhatsApp currently restricts template messaging for this business account." }
  }

  if (status.state === "all_messages_restricted") {
    return { allowed: false, reason: "WhatsApp currently restricts all messaging for this business account." }
  }

  if (status.state === "account_locked") {
    return { allowed: false, reason: "The WhatsApp Business Account is locked pending review or appeal." }
  }

  if (status.state === "disabled") {
    return { allowed: false, reason: "The WhatsApp Business Account is disabled." }
  }

  return { allowed: false, reason: "WhatsApp messaging is unavailable." }
}

export function deriveWhatsAppEnforcementState(value: unknown): {
  state: WhatsAppEnforcementState
  restrictionUntil?: string
  policyName?: string
  summary?: string
} {
  const text = JSON.stringify(value ?? {}).toLowerCase()

  let state: WhatsAppEnforcementState = "unknown"
  if (/permanent|disabled|offboard/.test(text)) state = "disabled"
  else if (/account.?lock|locked|indefinite/.test(text)) state = "account_locked"
  else if (/all.?message|any.?message|30.?day|7.?day|5.?day/.test(text)) state = "all_messages_restricted"
  else if (/marketing|utility|authentication|template|1.?day|3.?day/.test(text)) state = "template_restricted"
  else if (/warning|violation/.test(text)) state = "warning"
  else if (/healthy|reversed|resolved|cleared/.test(text)) state = "healthy"

  const object = value && typeof value === "object" ? (value as Record<string, unknown>) : {}
  const restrictionUntil = firstIsoDate(object)
  const policyName = firstStringByKey(object, /policy|policy_name|violation_type/i)
  const summary = firstStringByKey(object, /summary|description|reason|message/i)

  return {
    state,
    ...(restrictionUntil ? { restrictionUntil } : {}),
    ...(policyName ? { policyName } : {}),
    ...(summary ? { summary } : {}),
  }
}

function firstStringByKey(value: unknown, pattern: RegExp): string | undefined {
  if (!value || typeof value !== "object") return undefined
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (pattern.test(key) && typeof child === "string" && child.trim()) return child.trim().slice(0, 500)
    const nested = firstStringByKey(child, pattern)
    if (nested) return nested
  }
  return undefined
}

function firstIsoDate(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (/until|expires|end/i.test(key) && typeof child === "string") {
      const time = Date.parse(child)
      if (Number.isFinite(time)) return new Date(time).toISOString()
    }
    const nested = firstIsoDate(child)
    if (nested) return nested
  }
  return undefined
}
