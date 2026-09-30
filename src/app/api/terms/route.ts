import { fail, ok } from "@/lib/api"
import { resolveMutationOwner, resolveOwner } from "@/lib/board-session"
import { isTermsAcceptanceContext } from "@/lib/legal"
import { clientIp, clientUserAgent, recordTermsAcceptance } from "@/lib/terms-acceptance"
import { getTermsStatus } from "@/lib/terms-gate"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: Request) {
  const owner = await resolveOwner(request)
  if (!owner || owner.kind !== "auth") {
    return fail("Sign in to check Terms status.", 401)
  }
  try {
    const status = await getTermsStatus(owner.id)
    return ok({
      current: status.current,
      termsVersion: status.termsVersion,
      privacyVersion: status.privacyVersion,
      acceptedTermsVersion: status.acceptedTermsVersion,
      acceptedPrivacyVersion: status.acceptedPrivacyVersion,
      tableMissing: status.tableMissing,
    })
  } catch {
    return fail("The board database did not respond.", 500)
  }
}

export async function POST(request: Request) {
  const owner = await resolveMutationOwner(request)
  if (!owner || owner.kind !== "auth") {
    return fail("Sign in to accept the Terms.", 401)
  }
  try {
    const body = (await request.json().catch(() => ({}))) as {
      context?: unknown
      ageAttested?: unknown
      privacyAcknowledged?: unknown
      locale?: unknown
    }
    const contextRaw = typeof body.context === "string" ? body.context : "signup"
    if (!isTermsAcceptanceContext(contextRaw)) {
      return fail("Choose signup or reaccept.")
    }
    const ageAttested = body.ageAttested === true
    const privacyAcknowledged = body.privacyAcknowledged === true
    const locale = typeof body.locale === "string" ? body.locale.slice(0, 16) : null
    const result = await recordTermsAcceptance(owner.id, contextRaw, {
      ip: clientIp(request),
      userAgent: clientUserAgent(request),
      ageAttested,
      privacyAcknowledged,
      locale,
    })
    if (!result.ok) return fail("Could not record Terms acceptance.")
    const status = await getTermsStatus(owner.id)
    return ok({
      accepted: true,
      alreadyCurrent: result.alreadyCurrent === true,
      current: status.current,
      termsVersion: status.termsVersion,
      privacyVersion: status.privacyVersion,
    })
  } catch {
    return fail("The board database did not respond.", 500)
  }
}
