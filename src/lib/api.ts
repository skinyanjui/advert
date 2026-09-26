import { NextResponse } from "next/server"

const tokenPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function ownerToken(request: Request): string | undefined {
  const token = request.headers.get("x-owner-token")?.trim() ?? ""
  return tokenPattern.test(token) ? token : undefined
}

export function requireOwner(request: Request): { ok: true; token: string } | { ok: false; response: NextResponse } {
  const token = ownerToken(request)
  if (!token) {
    return { ok: false, response: fail("This browser has no account token.", 400) }
  }
  return { ok: true, token }
}

export function fail(reason: string, status = 400): NextResponse {
  return NextResponse.json({ ok: false, reason }, { status })
}

export function ok<T extends Record<string, unknown>>(body: T): NextResponse {
  return NextResponse.json({ ok: true, ...body })
}
