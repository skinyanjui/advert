import { NextResponse } from "next/server"

import { fail } from "@/lib/api"
import { searchBoard } from "@/lib/board-search"
import { newSession, resolveOwner } from "@/lib/board-session"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function param(url: URL, key: string, max = 120) {
  const value = url.searchParams.get(key)?.trim().slice(0, max)
  return value || undefined
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const owner = await resolveOwner(request)
    const result = await searchBoard({
      country: param(url, "country", 2),
      city: param(url, "city", 80),
      category: param(url, "category", 40),
      subcategory: param(url, "type", 80),
      q: param(url, "q", 120),
      cursor: param(url, "cursor", 512),
      limit: Number(url.searchParams.get("limit") ?? 25),
    })
    const payload = { ...result, auth: owner?.kind === "auth" }
    if (owner) return NextResponse.json(payload)
    const response = NextResponse.json(payload)
    newSession(response)
    return response
  } catch {
    return fail("Browse results are temporarily unavailable.", 503)
  }
}
