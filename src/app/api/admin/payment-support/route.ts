import { canOwner } from "@/lib/access-control"
import { fail, ok } from "@/lib/api"
import { resolveMutationOwner, resolveOwner } from "@/lib/board-session"
import { confirmSupportVerification, paymentSupportStatus, sendSupportVerification } from "@/lib/payment-support"
import { paymentSupportActionSchema } from "@/lib/payment-support-policy"
import { readApiInput } from "@/lib/runtime-contracts"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: Request) {
  const owner = await resolveOwner(request)
  if (!owner || owner.kind !== "auth" || !canOwner(owner, "promotion:manage")) return fail("Admin access required.", 403)
  try { return ok(await paymentSupportStatus()) }
  catch { return fail("Support verification could not be loaded.", 503) }
}

export async function POST(request: Request) {
  const owner = await resolveMutationOwner(request)
  if (!owner || owner.kind !== "auth" || !canOwner(owner, "promotion:manage")) return fail("Admin access required.", 403)
  const parsed = await readApiInput(request, paymentSupportActionSchema)
  if (!parsed.ok) return fail(parsed.reason)
  try {
    if (parsed.value.action === "send") await sendSupportVerification()
    else await confirmSupportVerification(parsed.value.code)
    return ok(await paymentSupportStatus())
  } catch (error) { return fail(error instanceof Error ? error.message : "Support verification failed.", 503) }
}
