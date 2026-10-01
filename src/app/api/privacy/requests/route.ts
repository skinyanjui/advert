import { privacyRequestInputSchema, readApiInput } from "@/lib/runtime-contracts"
import { fail, ok } from "@/lib/api"
import { resolveMutationOwner, resolveOwner } from "@/lib/board-session"
import {
  createPrivacyRequest,
  listPrivacyRequestsForUser,
} from "@/lib/privacy-requests"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function cleanEmail(value: unknown): string {
  if (typeof value !== "string") return ""
  const email = value.trim().toLowerCase()
  if (email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return ""
  return email
}

export async function GET(request: Request) {
  const owner = await resolveOwner(request)
  if (!owner || owner.kind !== "auth") {
    return fail("Sign in to view your privacy requests.", 401)
  }
  try {
    return ok({ requests: await listPrivacyRequestsForUser(owner.id) })
  } catch {
    return fail("Could not load privacy requests.", 500)
  }
}

export async function POST(request: Request) {
  const owner = await resolveMutationOwner(request)
  try {
    const parsed = await readApiInput(request, privacyRequestInputSchema)
    if (!parsed.ok) return fail(parsed.reason)
    const body = parsed.value
    const { jurisdiction, requestType, actingAsAgent } = body
    const suppliedEmail = cleanEmail(body.email)
    const accountEmail = owner?.kind === "auth" ? cleanEmail(owner.email) : ""
    const requestEmail = accountEmail || suppliedEmail
    if (!requestEmail) return fail("Enter a valid email address.")

    const subjectEmail = actingAsAgent ? cleanEmail(body.subjectEmail) : null
    if (actingAsAgent && !subjectEmail) {
      return fail("Enter the email address of the person you are acting for.")
    }

    const details =
      typeof body.details === "string" && body.details.trim()
        ? body.details.trim().slice(0, 1500)
        : null
    const locale =
      typeof body.locale === "string" && body.locale.trim()
        ? body.locale.trim().slice(0, 16)
        : null

    const authenticatedSelf =
      owner?.kind === "auth" &&
      !actingAsAgent &&
      Boolean(accountEmail)
    const choiceRequestWithoutVerification =
      !actingAsAgent &&
      (requestType === "opt_out" || requestType === "limit_sensitive")
    const verificationRequired =
      !authenticatedSelf && !choiceRequestWithoutVerification

    const result = await createPrivacyRequest({
      userId: owner?.kind === "auth" ? owner.id : null,
      requestEmail,
      subjectEmail,
      actingAsAgent,
      jurisdiction,
      requestType,
      details,
      locale,
      verified: authenticatedSelf,
      verificationRequired,
    })
    if (!result.ok) return fail(result.reason, 429)

    return ok({
      request: result.value,
      verificationRequired: result.value.status === "verification_required",
    })
  } catch {
    return fail("Could not submit the privacy request.", 500)
  }
}
