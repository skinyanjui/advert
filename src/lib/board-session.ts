import "server-only"

import { createHmac, randomUUID, timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"

import { accountDeletionPending } from "@/lib/account-deletion"
import { resolvePersistedRole, type PersistedAppRole } from "@/lib/rbac-store"
import { createServerSupabase } from "@/lib/supabase/server"

const cookieName = "board_session"
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export type BoardOwner = {
  id: string
  kind: "auth" | "session"
  email?: string
  role?: PersistedAppRole
}

function signature(id: string) {
  const secret = process.env.BOARD_SESSION_SECRET ?? process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret || secret.length < 32) throw new Error("A server-only session signing key must have at least 32 characters")
  return createHmac("sha256", secret).update("board-session-v1:").update(id).digest("hex")
}

export function sessionOwner(request: Request): string | undefined {
  const value = request.headers
    .get("cookie")
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`))
    ?.slice(cookieName.length + 1)
  if (!value) return undefined
  const [id, mac] = value.split(".")
  if (!uuid.test(id ?? "") || !/^[a-f0-9]{64}$/.test(mac ?? "")) return undefined
  const expected = Buffer.from(signature(id), "hex")
  return timingSafeEqual(Buffer.from(mac, "hex"), expected) ? id : undefined
}

export function newSession(response: NextResponse): string {
  const id = randomUUID()
  response.cookies.set(cookieName, `${id}.${signature(id)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  })
  return id
}

export function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin")
  const url = new URL(request.url)
  return Boolean(origin && origin === url.origin)
}

async function authOwner(): Promise<BoardOwner | undefined> {
  try {
    const supabase = await createServerSupabase()
    const { data, error } = await supabase.auth.getUser()
    if (error || !data.user) return undefined
    const email = data.user.email ?? undefined
    const role = await resolvePersistedRole(data.user.id, email)
    return { id: data.user.id, kind: "auth", email, role }
  } catch {
    return undefined
  }
}

/** Prefer the signed-in account; otherwise the anonymous board cookie. */
export async function resolveOwner(request: Request): Promise<BoardOwner | undefined> {
  const auth = await authOwner()
  if (auth) return auth
  const session = sessionOwner(request)
  return session ? { id: session, kind: "session" } : undefined
}

export async function resolveMutationOwner(request: Request): Promise<BoardOwner | undefined> {
  if (!sameOrigin(request)) return undefined
  const owner = await resolveOwner(request)
  if (owner?.kind === "auth" && await accountDeletionPending(owner.id)) return undefined
  return owner
}

/** @deprecated Prefer resolveMutationOwner — kept for call sites during migration. */
export async function mutationOwner(request: Request): Promise<string | undefined> {
  const owner = await resolveMutationOwner(request)
  return owner?.id
}
