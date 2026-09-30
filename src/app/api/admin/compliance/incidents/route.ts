import { canOwner } from "@/lib/access-control"
import { fail, ok } from "@/lib/api"
import { resolveMutationOwner, resolveOwner } from "@/lib/board-session"
import {
  createComplianceIncident,
  listComplianceIncidents,
  updateComplianceIncident,
} from "@/lib/compliance-incidents"
import { isIncidentSeverity } from "@/lib/compliance-incident-types"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

async function requireAdmin(request: Request, mutating: boolean) {
  const owner = mutating ? await resolveMutationOwner(request) : await resolveOwner(request)
  if (!canOwner(owner, "admin") || !owner || owner.kind !== "auth") return undefined
  return owner
}

export async function GET(request: Request) {
  const admin = await requireAdmin(request, false)
  if (!admin) return fail("Admin access required.", 403)
  try {
    return ok({ incidents: await listComplianceIncidents() })
  } catch {
    return fail("Could not load compliance incidents.", 500)
  }
}

export async function POST(request: Request) {
  const admin = await requireAdmin(request, true)
  if (!admin) return fail("Admin access required.", 403)
  try {
    const body = (await request.json()) as {
      title?: unknown
      severity?: unknown
      discoveredAt?: unknown
      personalDataInvolved?: unknown
      sensitiveDataInvolved?: unknown
      affectedPeopleEstimate?: unknown
      jurisdictions?: unknown
      description?: unknown
    }
    const title = typeof body.title === "string" ? body.title.trim().slice(0, 200) : ""
    const severity = typeof body.severity === "string" ? body.severity : ""
    const discoveredAt = typeof body.discoveredAt === "string" ? body.discoveredAt : ""
    const description = typeof body.description === "string" ? body.description.trim().slice(0, 5000) : ""
    const date = new Date(discoveredAt)
    if (title.length < 3) return fail("Add an incident title.")
    if (!isIncidentSeverity(severity)) return fail("Choose incident severity.")
    if (!discoveredAt || Number.isNaN(date.getTime())) return fail("Add the incident discovery time.")
    if (!description) return fail("Describe the incident.")
    const affected =
      typeof body.affectedPeopleEstimate === "number" &&
      Number.isInteger(body.affectedPeopleEstimate) &&
      body.affectedPeopleEstimate >= 0
        ? body.affectedPeopleEstimate
        : null
    const jurisdictions = Array.isArray(body.jurisdictions)
      ? body.jurisdictions
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim().slice(0, 80))
          .filter(Boolean)
          .slice(0, 30)
      : []

    return ok({
      incident: await createComplianceIncident(admin.id, {
        title,
        severity,
        discoveredAt: date.toISOString(),
        personalDataInvolved: body.personalDataInvolved === true,
        sensitiveDataInvolved: body.sensitiveDataInvolved === true,
        affectedPeopleEstimate: affected,
        jurisdictions,
        description,
      }),
    })
  } catch {
    return fail("Could not create the compliance incident.", 500)
  }
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin(request, true)
  if (!admin) return fail("Admin access required.", 403)
  try {
    const body = (await request.json()) as {
      incidentId?: unknown
      action?: unknown
      assessment?: unknown
      regulatorNotificationRequired?: unknown
      userNotificationRequired?: unknown
    }
    const incidentId = typeof body.incidentId === "string" ? body.incidentId.trim() : ""
    const action = typeof body.action === "string" ? body.action : ""
    if (!incidentId) return fail("Choose an incident.")
    if (!["investigate", "contain", "assess", "regulator_notified", "users_notified", "close"].includes(action)) {
      return fail("Choose a valid incident action.")
    }

    const result = await updateComplianceIncident(admin.id, incidentId, {
      action: action as "investigate" | "contain" | "assess" | "regulator_notified" | "users_notified" | "close",
      assessment:
        typeof body.assessment === "string" ? body.assessment.trim().slice(0, 5000) : null,
      regulatorNotificationRequired:
        typeof body.regulatorNotificationRequired === "boolean"
          ? body.regulatorNotificationRequired
          : null,
      userNotificationRequired:
        typeof body.userNotificationRequired === "boolean"
          ? body.userNotificationRequired
          : null,
    })
    if (!result.ok) return fail(result.reason)
    return ok({ incident: result.value, incidents: await listComplianceIncidents() })
  } catch {
    return fail("Could not update the compliance incident.", 500)
  }
}
