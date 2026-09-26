import "server-only"

import { createHmac, randomUUID, timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"

const cookieName = "board_session"
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function signature(id: string) {
  const secret = process.env.BOARD_SESSION_SECRET ?? process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret || secret.length < 32) throw new Error("A server-only session signing key must have at least 32 characters")
  return createHmac("sha256", secret).update("board-session-v1:").update(id).digest("hex")
}

export function sessionOwner(request: Request): string | undefined {
  const value = request.headers.get("cookie")?.split(";").map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1)
  if (!value) return undefined
  const [id, mac] = value.split(".")
  if (!uuid.test(id ?? "") || !/^[a-f0-9]{64}$/.test(mac ?? "")) return undefined
  const expected = Buffer.from(signature(id), "hex")
  return timingSafeEqual(Buffer.from(mac, "hex"), expected) ? id : undefined
}

export function newSession(response: NextResponse): string {
  const id = randomUUID()
  response.cookies.set(cookieName, `${id}.${signature(id)}`, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax",
    path: "/", maxAge: 60 * 60 * 24 * 365,
  })
  return id
}

export function mutationOwner(request: Request): string | undefined {
  const origin = request.headers.get("origin")
  const url = new URL(request.url)
  if (!origin || origin !== url.origin) return undefined
  return sessionOwner(request)
}
