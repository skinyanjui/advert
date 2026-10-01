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
  if (!canOwner(owner, "compliance:manage") || !owner || owner.kind !== "auth") return undefined
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
    const affected =
      typeof body.affectedPeopleEstimate === "number" && Number.isFinite(body.affectedPeopleEstimate)
        ? Math.max(0, Math.floor(body.affectedPeopleEstimate))
        : null
    const jurisdictions = Array.isArray(body.jurisdictions)
      ? body.jurisdictions.filter((value): value is string => typeof value === "string").map((value) => value.slice(0, 80)).slice(0, 30)
      : []

    if (title.length < 3) return fail("Add an incident title.")
    if (!isIncidentSeverity(severity)) return fail("Choose an incident severity.")
    if (!discoveredAt || Number.isNaN(new Date(discoveredAt).getTime())) return fail("Enter when the incident was discovered.")
    if (!description) return fail("Describe what happened and what is known so far.")

    const incident = await createComplianceIncident(admin.id, {
      title,
      severity,
      discoveredAt: new Date(discoveredAt).toISOString(),
      personalDataInvolved: body.personalDataInvolved === true,
      sensitiveDataInvolved: body.sensitiveDataInvolved === true,
      affectedPeopleEstimate: affected,
      jurisdictions,
      description,
    })
    return ok({ incident, incidents: await listComplianceIncidents() })
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
    const allowed = ["investigate","contain","assess","regulator_notified","users_notified","close"]
    if (!incidentId) return fail("Choose an incident.")
    if (!allowed.includes(action)) return fail("Choose a valid incident action.")

    const result = await updateComplianceIncident(admin.id, incidentId, {
      action: action as "investigate" | "contain" | "assess" | "regulator_notified" | "users_notified" | "close",
      assessment: typeof body.assessment === "string" ? body.assessment : null,
      regulatorNotificationRequired:
        typeof body.regulatorNotificationRequired === "boolean" ? body.regulatorNotificationRequired : null,
      userNotificationRequired:
        typeof body.userNotificationRequired === "boolean" ? body.userNotificationRequired : null,
    })
    if (!result.ok) return fail(result.reason)
    return ok({ incident: result.value, incidents: await listComplianceIncidents() })
  } catch {
    return fail("Could not update the compliance incident.", 500)
  }
}
