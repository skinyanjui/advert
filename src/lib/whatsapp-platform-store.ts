import "server-only"

import { boardDb } from "@/lib/board-db"
import {
  deriveWhatsAppEnforcementState,
  type WhatsAppPlatformStatus,
} from "@/lib/whatsapp-platform-policy"

export async function recordWhatsAppAccountUpdate(
  wabaId: string,
  payload: unknown,
  receivedAt = new Date().toISOString(),
): Promise<WhatsAppPlatformStatus> {
  const derived = deriveWhatsAppEnforcementState(payload)
  const db = boardDb()

  const eventId = crypto.randomUUID()
  const { error: eventError } = await db.from("board_whatsapp_enforcement_events").insert({
    id: eventId,
    waba_id: wabaId,
    event_type: "account_update",
    enforcement_state: derived.state,
    restriction_until: derived.restrictionUntil ?? null,
    policy_name: derived.policyName ?? null,
    summary: derived.summary ?? null,
    provider_payload: payload,
    received_at: receivedAt,
  })
  if (eventError) throw new Error(eventError.message)

  const { error: statusError } = await db.from("board_whatsapp_platform_status").upsert(
    {
      waba_id: wabaId,
      enforcement_state: derived.state,
      restriction_until: derived.restrictionUntil ?? null,
      policy_name: derived.policyName ?? null,
      summary: derived.summary ?? null,
      last_event_at: receivedAt,
      last_event_id: eventId,
      updated_at: receivedAt,
    },
    { onConflict: "waba_id" },
  )
  if (statusError) throw new Error(statusError.message)

  return {
    wabaId,
    state: derived.state,
    restrictionUntil: derived.restrictionUntil ?? null,
    policyName: derived.policyName ?? null,
    summary: derived.summary ?? null,
    lastEventAt: receivedAt,
  }
}

export async function getWhatsAppPlatformStatus(wabaId: string): Promise<WhatsAppPlatformStatus> {
  const { data, error } = await boardDb()
    .from("board_whatsapp_platform_status")
    .select("waba_id,enforcement_state,restriction_until,policy_name,summary,last_event_at")
    .eq("waba_id", wabaId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return { wabaId, state: "unknown" }

  return {
    wabaId: String(data.waba_id),
    state: data.enforcement_state,
    restrictionUntil: data.restriction_until,
    policyName: data.policy_name,
    summary: data.summary,
    lastEventAt: data.last_event_at,
  }
}
