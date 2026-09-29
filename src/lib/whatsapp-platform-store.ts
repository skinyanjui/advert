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


type WhatsAppStatusRow = {
  waba_id: string
  enforcement_state: WhatsAppPlatformStatus["state"]
  restriction_until: string | null
  policy_name: string | null
  summary: string | null
  last_event_at: string | null
}

export async function listWhatsAppPlatformStatuses(): Promise<WhatsAppPlatformStatus[]> {
  const { data, error } = await boardDb()
    .from("board_whatsapp_platform_status")
    .select("waba_id,enforcement_state,restriction_until,policy_name,summary,last_event_at")
    .order("updated_at", { ascending: false })
  if (error) throw new Error(error.message)

  return ((data ?? []) as WhatsAppStatusRow[]).map((row) => ({
    wabaId: row.waba_id,
    state: row.enforcement_state,
    restrictionUntil: row.restriction_until,
    policyName: row.policy_name,
    summary: row.summary,
    lastEventAt: row.last_event_at,
  }))
}

export async function listWhatsAppPlatformEvents(limit = 50) {
  const { data, error } = await boardDb()
    .from("board_whatsapp_enforcement_events")
    .select("id,waba_id,enforcement_state,restriction_until,policy_name,summary,received_at")
    .order("received_at", { ascending: false })
    .limit(Math.max(1, Math.min(limit, 100)))
  if (error) throw new Error(error.message)
  return data ?? []
}
