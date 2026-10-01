import { termsAcceptanceSchema, readApiInput } from "@/lib/runtime-contracts"
import { fail, ok } from "@/lib/api"
import { resolveMutationOwner, resolveOwner } from "@/lib/board-session"
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
    const parsed = await readApiInput(request, termsAcceptanceSchema)
    if (!parsed.ok) return fail(parsed.reason)
    const { context: contextRaw, ageAttested, privacyAcknowledged, locale } = parsed.value
    const result = await recordTermsAcceptance(owner.id, contextRaw, {
      ip: clientIp(request),
      userAgent: clientUserAgent(request),
      ageAttested,
      privacyAcknowledged,
      locale: locale ?? null,
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
