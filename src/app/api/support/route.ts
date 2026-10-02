import { fail, ok } from "@/lib/api"
import { sameOrigin } from "@/lib/board-session"
import { readApiInput, supportRequestSchema } from "@/lib/runtime-contracts"
import { createSupportRequest } from "@/lib/support-store"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail("Invalid request origin.", 403)
  const parsed = await readApiInput(request, supportRequestSchema)
  if (!parsed.ok) return fail(parsed.reason)
  if (parsed.value.website) {
    return ok({ acknowledged: true })
  }
  try {
    const requestId = await createSupportRequest(request, parsed.value)
    return ok({
      acknowledged: true,
      requestId,
      message: "Your support request was received.",
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : ""
    if (/too many support requests/i.test(message)) {
      return fail("Too many support requests. Try again later.", 429)
    }
    return fail("Support could not receive your request. Try again.", 500)
  }
}
