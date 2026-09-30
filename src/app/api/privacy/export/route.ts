import { NextResponse } from "next/server"

import { canOwner } from "@/lib/access-control"
import { fail } from "@/lib/api"
import { resolveOwner } from "@/lib/board-session"
import { exportPrivacyData } from "@/lib/privacy-export"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: Request) {
  const owner = await resolveOwner(request)
  if (!canOwner(owner, "profile") || !owner || owner.kind !== "auth") {
    return fail("Sign in to download your data.", 401)
  }

  try {
    const data = await exportPrivacyData(owner.id, owner.email)
    const stamp = new Date().toISOString().slice(0, 10)
    return new NextResponse(JSON.stringify(data, null, 2), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "content-disposition": `attachment; filename="account-data-${stamp}.json"`,
        "cache-control": "no-store",
      },
    })
  } catch {
    return fail("Could not prepare your data export.", 500)
  }
}
