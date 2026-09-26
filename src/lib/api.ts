import { NextResponse } from "next/server"

export function fail(reason: string, status = 400): NextResponse {
  return NextResponse.json({ ok: false, reason }, { status })
}

export function ok<T extends Record<string, unknown>>(body: T): NextResponse {
  return NextResponse.json({ ok: true, ...body })
}
