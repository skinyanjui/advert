import { createHash, timingSafeEqual } from "node:crypto"

import { syncReferenceData } from "@/lib/reference-sync"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function validSecret(actual: string | null, expected: string | undefined) {
  if (!expected || !actual) return false
  const provided = actual.startsWith("Bearer ") ? actual.slice(7) : ""
  const a = createHash("sha256").update(provided).digest()
  const b = createHash("sha256").update(expected).digest()
  return timingSafeEqual(a, b) && provided.length > 0
}

export async function POST(request: Request) {
  if (!validSecret(request.headers.get("authorization"), process.env.REFERENCE_WEBHOOK_SECRET)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    return Response.json({ ok: true, imported: await syncReferenceData() })
  } catch (error) {
    console.error("Reference sync failed", error)
    return Response.json({ error: "Reference sync failed" }, { status: 500 })
  }
}
