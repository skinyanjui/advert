import "server-only"

import { createHmac } from "node:crypto"

import { boardDb } from "@/lib/board-db"
import type { SupportCategory } from "@/lib/support"

export type SupportRequestInput = {
  category: SupportCategory
  email: string
  message: string
}

function check(error: { message: string } | null | undefined): void {
  if (error) throw new Error(error.message)
}

function supportHashSecret(): string {
  const secret = process.env.BOARD_SESSION_SECRET ?? process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret || secret.length < 32) throw new Error("A server-only support hashing key must have at least 32 characters")
  return secret
}

function requestAddress(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  return forwarded || "unknown"
}

function actorHash(request: Request, email: string): string {
  return createHmac("sha256", supportHashSecret())
    .update("support-request-v1\0")
    .update(requestAddress(request))
    .update("\0")
    .update(email.trim().toLowerCase())
    .digest("hex")
}

export async function createSupportRequest(request: Request, input: SupportRequestInput): Promise<string> {
  const { data, error } = await boardDb().rpc("create_board_support_request", {
    p_category: input.category,
    p_email: input.email,
    p_message: input.message,
    p_actor_hash: actorHash(request, input.email),
  })
  check(error)
  if (typeof data !== "string") throw new Error("Support request ID was not returned")
  return data
}

export async function listSupportRequests(limit = 100) {
  const safeLimit = Math.max(1, Math.min(200, Math.trunc(limit)))
  const { data, error } = await boardDb()
    .from("board_support_requests")
    .select("id,category,email,message,status,created_at,acknowledged_at,assigned_to,resolved_at,resolution_note")
    .order("created_at", { ascending: false })
    .limit(safeLimit)
  check(error)
  return data ?? []
}
