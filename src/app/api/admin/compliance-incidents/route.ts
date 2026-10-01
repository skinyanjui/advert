import { complianceIncidentInputSchema, complianceIncidentUpdateSchema, readApiInput } from "@/lib/runtime-contracts"
import { canOwner } from "@/lib/access-control"
import { fail, ok } from "@/lib/api"
import { resolveMutationOwner, resolveOwner } from "@/lib/board-session"
import {
  createComplianceIncident,
  listComplianceIncidents,
  updateComplianceIncident,
} from "@/lib/compliance-incidents"

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
    const parsed = await readApiInput(request, complianceIncidentInputSchema)
    if (!parsed.ok) return fail(parsed.reason)
    const incident = await createComplianceIncident(admin.id, parsed.value)
    return ok({ incident, incidents: await listComplianceIncidents() })
  } catch {
    return fail("Could not create the compliance incident.", 500)
  }
}

export async function PATCH(request: Request) {
  const admin = await requireAdmin(request, true)
  if (!admin) return fail("Admin access required.", 403)
  try {
    const parsed = await readApiInput(request, complianceIncidentUpdateSchema)
    if (!parsed.ok) return fail(parsed.reason)
    const { incidentId, ...input } = parsed.value
    const result = await updateComplianceIncident(admin.id, incidentId, input)
    if (!result.ok) return fail(result.reason)
    return ok({ incident: result.value, incidents: await listComplianceIncidents() })
  } catch {
    return fail("Could not update the compliance incident.", 500)
  }
}
