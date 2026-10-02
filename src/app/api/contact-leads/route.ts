import { resolveOwner } from "@/lib/board-session"
import { contactLeadsResponse } from "@/lib/contact-leads"
import { listContactLeads } from "@/lib/contact-leads-store"
import { requireCurrentTerms } from "@/lib/terms-gate"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  return contactLeadsResponse(request, { resolveOwner, requireCurrentTerms, list: listContactLeads })
}
