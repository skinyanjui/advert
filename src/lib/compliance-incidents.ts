import "server-only"

import { boardDb } from "@/lib/board-db"
import type {
  ComplianceIncident,
  ComplianceIncidentSeverity,
  ComplianceIncidentStatus,
} from "@/lib/compliance-incident-types"

type IncidentRow = {
  id: string
  title: string
  severity: ComplianceIncidentSeverity
  status: ComplianceIncidentStatus
  discovered_at: string
  contained_at: string | null
  closed_at: string | null
  personal_data_involved: boolean
  sensitive_data_involved: boolean
  affected_people_estimate: number | null
  jurisdictions: string[] | null
  description: string
  assessment: string | null
  regulator_notification_required: boolean | null
  user_notification_required: boolean | null
  regulator_notified_at: string | null
  users_notified_at: string | null
  created_at: string
  updated_at: string
}

const select =
  "id,title,severity,status,discovered_at,contained_at,closed_at,personal_data_involved,sensitive_data_involved,affected_people_estimate,jurisdictions,description,assessment,regulator_notification_required,user_notification_required,regulator_notified_at,users_notified_at,created_at,updated_at"

function unpack(row: IncidentRow): ComplianceIncident {
  return {
    id: row.id,
    title: row.title,
    severity: row.severity,
    status: row.status,
    discoveredAt: row.discovered_at,
    containedAt: row.contained_at,
    closedAt: row.closed_at,
    personalDataInvolved: row.personal_data_involved,
    sensitiveDataInvolved: row.sensitive_data_involved,
    affectedPeopleEstimate: row.affected_people_estimate,
    jurisdictions: Array.isArray(row.jurisdictions) ? row.jurisdictions : [],
    description: row.description,
    assessment: row.assessment,
    regulatorNotificationRequired: row.regulator_notification_required,
    userNotificationRequired: row.user_notification_required,
    regulatorNotifiedAt: row.regulator_notified_at,
    usersNotifiedAt: row.users_notified_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function check(error: { message: string } | null) {
  if (error) throw new Error(error.message)
}

export async function listComplianceIncidents(): Promise<ComplianceIncident[]> {
  const { data, error } = await boardDb()
    .from("compliance_incidents")
    .select(select)
    .order("discovered_at", { ascending: false })
    .limit(200)
  check(error)
  return ((data ?? []) as IncidentRow[]).map(unpack)
}

export async function createComplianceIncident(
  adminId: string,
  input: {
    title: string
    severity: ComplianceIncidentSeverity
    discoveredAt: string
    personalDataInvolved: boolean
    sensitiveDataInvolved: boolean
    affectedPeopleEstimate: number | null
    jurisdictions: string[]
    description: string
  },
) {
  const db = boardDb()
  const now = new Date().toISOString()
  const id = crypto.randomUUID()
  const { data, error } = await db
    .from("compliance_incidents")
    .insert({
      id,
      title: input.title,
      severity: input.severity,
      status: "open",
      discovered_at: input.discoveredAt,
      personal_data_involved: input.personalDataInvolved,
      sensitive_data_involved: input.sensitiveDataInvolved,
      affected_people_estimate: input.affectedPeopleEstimate,
      jurisdictions: input.jurisdictions,
      description: input.description,
      owner_user_id: adminId,
      created_at: now,
      updated_at: now,
    })
    .select(select)
    .single()
  check(error)
  const { error: eventError } = await db.from("compliance_incident_events").insert({
    id: crypto.randomUUID(),
    incident_id: id,
    actor_user_id: adminId,
    event_type: "created",
    note: "Incident record created.",
  })
  check(eventError)
  return unpack(data as IncidentRow)
}

export async function updateComplianceIncident(
  adminId: string,
  incidentId: string,
  input: {
    action: "investigate" | "contain" | "assess" | "regulator_notified" | "users_notified" | "close"
    assessment?: string | null
    regulatorNotificationRequired?: boolean | null
    userNotificationRequired?: boolean | null
  },
) {
  const db = boardDb()
  const now = new Date().toISOString()
  const patch: Record<string, unknown> = { updated_at: now, owner_user_id: adminId }
  let eventType:
    | "investigation_started"
    | "contained"
    | "assessment_updated"
    | "regulator_notified"
    | "users_notified"
    | "closed"

  if (input.action === "investigate") {
    patch.status = "investigating"
    eventType = "investigation_started"
  } else if (input.action === "contain") {
    patch.status = "contained"
    patch.contained_at = now
    eventType = "contained"
  } else if (input.action === "assess") {
    patch.assessment = input.assessment?.trim().slice(0, 5000) || null
    patch.regulator_notification_required = input.regulatorNotificationRequired ?? null
    patch.user_notification_required = input.userNotificationRequired ?? null
    eventType = "assessment_updated"
  } else if (input.action === "regulator_notified") {
    patch.regulator_notified_at = now
    eventType = "regulator_notified"
  } else if (input.action === "users_notified") {
    patch.users_notified_at = now
    eventType = "users_notified"
  } else {
    patch.status = "closed"
    patch.closed_at = now
    eventType = "closed"
  }

  const { data, error } = await db
    .from("compliance_incidents")
    .update(patch)
    .eq("id", incidentId)
    .select(select)
    .maybeSingle()
  check(error)
  if (!data) return { ok: false as const, reason: "Incident not found." }

  const { error: eventError } = await db.from("compliance_incident_events").insert({
    id: crypto.randomUUID(),
    incident_id: incidentId,
    actor_user_id: adminId,
    event_type: eventType,
    note: input.assessment?.trim().slice(0, 3000) || null,
  })
  check(eventError)
  return { ok: true as const, value: unpack(data as IncidentRow) }
}
