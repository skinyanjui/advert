export const complianceIncidentSeverities = ["low", "medium", "high", "critical"] as const
export type ComplianceIncidentSeverity = (typeof complianceIncidentSeverities)[number]

export const complianceIncidentStatuses = ["open", "investigating", "contained", "closed"] as const
export type ComplianceIncidentStatus = (typeof complianceIncidentStatuses)[number]

export type ComplianceIncident = {
  id: string
  title: string
  severity: ComplianceIncidentSeverity
  status: ComplianceIncidentStatus
  discoveredAt: string
  containedAt: string | null
  closedAt: string | null
  personalDataInvolved: boolean
  sensitiveDataInvolved: boolean
  affectedPeopleEstimate: number | null
  jurisdictions: string[]
  description: string
  assessment: string | null
  regulatorNotificationRequired: boolean | null
  userNotificationRequired: boolean | null
  regulatorNotifiedAt: string | null
  usersNotifiedAt: string | null
  createdAt: string
  updatedAt: string
}

export function isIncidentSeverity(value: string): value is ComplianceIncidentSeverity {
  return (complianceIncidentSeverities as readonly string[]).includes(value)
}

export function incidentStatusLabel(value: ComplianceIncidentStatus): string {
  if (value === "investigating") return "Investigating"
  return value.charAt(0).toUpperCase() + value.slice(1)
}
