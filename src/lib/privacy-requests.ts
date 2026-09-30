import "server-only"

import { boardDb } from "@/lib/board-db"
import { sendEmail } from "@/lib/email"
import { site } from "@/lib/site"
import {
  privacyDueAt,
  type PrivacyJurisdiction,
  type PrivacyRequestStatus,
  type PrivacyRequestType,
} from "@/lib/privacy-rights"

type CreatePrivacyRequestInput = {
  userId: string | null
  requestEmail: string
  subjectEmail: string | null
  actingAsAgent: boolean
  jurisdiction: PrivacyJurisdiction
  requestType: PrivacyRequestType
  details: string | null
  locale: string | null
  verified: boolean
  verificationRequired: boolean
}

export type PrivacyRequestRecord = {
  id: string
  userId: string | null
  requestEmail: string
  subjectEmail: string | null
  actingAsAgent: boolean
  jurisdiction: PrivacyJurisdiction
  requestType: PrivacyRequestType
  details: string | null
  locale: string | null
  status: PrivacyRequestStatus
  receivedAt: string
  dueAt: string
  verifiedAt: string | null
  verificationMethod: "authenticated_account" | "manual" | "authorized_agent" | null
  acknowledgmentSentAt: string | null
  completedAt: string | null
  updatedAt: string
  resolution: string | null
}

type PrivacyRequestRow = {
  id: string
  user_id: string | null
  request_email: string
  subject_email: string | null
  acting_as_agent: boolean
  jurisdiction: PrivacyJurisdiction
  request_type: PrivacyRequestType
  details: string | null
  locale: string | null
  status: PrivacyRequestStatus
  received_at: string
  due_at: string
  verified_at: string | null
  verification_method: "authenticated_account" | "manual" | "authorized_agent" | null
  acknowledgment_sent_at: string | null
  completed_at: string | null
  updated_at: string
  resolution: string | null
}

const select =
  "id,user_id,request_email,subject_email,acting_as_agent,jurisdiction,request_type,details,locale,status,received_at,due_at,verified_at,verification_method,acknowledgment_sent_at,completed_at,updated_at,resolution"

function unpack(row: PrivacyRequestRow): PrivacyRequestRecord {
  return {
    id: row.id,
    userId: row.user_id,
    requestEmail: row.request_email,
    subjectEmail: row.subject_email,
    actingAsAgent: row.acting_as_agent,
    jurisdiction: row.jurisdiction,
    requestType: row.request_type,
    details: row.details,
    locale: row.locale,
    status: row.status,
    receivedAt: row.received_at,
    dueAt: row.due_at,
    verifiedAt: row.verified_at,
    verificationMethod: row.verification_method,
    acknowledgmentSentAt: row.acknowledgment_sent_at,
    completedAt: row.completed_at,
    updatedAt: row.updated_at,
    resolution: row.resolution,
  }
}

function check(error: { message: string } | null) {
  if (error) throw new Error(error.message)
}

export async function createPrivacyRequest(input: CreatePrivacyRequestInput) {
  const db = boardDb()
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count, error: countError } = await db
    .from("privacy_requests")
    .select("id", { count: "exact", head: true })
    .eq("request_email", input.requestEmail)
    .gte("received_at", dayAgo)
  check(countError)
  if ((count ?? 0) >= 5) {
    return { ok: false as const, reason: "Too many privacy requests were submitted for this email today." }
  }

  const id = crypto.randomUUID()
  const now = new Date().toISOString()
  const status: PrivacyRequestStatus =
    input.verified || !input.verificationRequired ? "received" : "verification_required"
  const { data, error } = await db
    .from("privacy_requests")
    .insert({
      id,
      user_id: input.userId,
      request_email: input.requestEmail,
      subject_email: input.subjectEmail,
      acting_as_agent: input.actingAsAgent,
      jurisdiction: input.jurisdiction,
      request_type: input.requestType,
      details: input.details,
      locale: input.locale,
      status,
      received_at: now,
      due_at: privacyDueAt(input.jurisdiction, input.requestType, new Date(now)),
      verified_at: input.verified ? now : null,
      verification_method: input.verified ? "authenticated_account" : null,
      updated_at: now,
    })
    .select(select)
    .single()
  check(error)

  const { error: eventError } = await db.from("privacy_request_events").insert({
    id: crypto.randomUUID(),
    request_id: id,
    actor_user_id: input.userId,
    event_type: "created",
    note: input.verified
      ? "Request submitted by an authenticated account."
      : input.verificationRequired
        ? "Identity verification required before account data is disclosed or changed."
        : "Request type does not require identity verification before the choice is honored.",
  })
  check(eventError)

  const created = unpack(data as PrivacyRequestRow)
  const emailResult = await sendEmail({
    to: input.requestEmail,
    subject: `${site.name}: privacy request received`,
    text: [
      "We received your privacy request.",
      "",
      `Tracking ID: ${created.id}`,
      `Request: ${created.requestType}`,
      `Status: ${created.status}`,
      `Received: ${created.receivedAt}`,
      `Internal target date: ${created.dueAt.slice(0, 10)}`,
      "",
      created.status === "verification_required"
        ? "Identity or authority verification is required before account data is disclosed or changed."
        : created.verificationMethod === "authenticated_account"
          ? "This request was submitted from a signed-in account and is marked account-verified."
          : "This request type can be processed without identity verification; we may still need information needed to apply the choice.",
      "",
      "Do not reply with passwords, government ID numbers, bank information, medical records, or identity-document images.",
    ].join("\n"),
  })

  if (emailResult.ok && emailResult.provider === "resend") {
    const sentAt = new Date().toISOString()
    const { data: acknowledged, error: acknowledgmentError } = await db
      .from("privacy_requests")
      .update({ acknowledgment_sent_at: sentAt, updated_at: sentAt })
      .eq("id", id)
      .select(select)
      .single()
    check(acknowledgmentError)
    const { error: acknowledgmentEventError } = await db.from("privacy_request_events").insert({
      id: crypto.randomUUID(),
      request_id: id,
      actor_user_id: input.userId,
      event_type: "updated",
      note: "Transactional privacy request acknowledgment sent.",
    })
    check(acknowledgmentEventError)
    return { ok: true as const, value: unpack(acknowledged as PrivacyRequestRow) }
  }

  if (!emailResult.ok) {
    console.error("Could not send privacy request acknowledgment", emailResult.reason)
  }

  return { ok: true as const, value: created }
}

export async function listPrivacyRequestsForUser(userId: string): Promise<PrivacyRequestRecord[]> {
  const { data, error } = await boardDb()
    .from("privacy_requests")
    .select(select)
    .eq("user_id", userId)
    .order("received_at", { ascending: false })
    .limit(50)
  check(error)
  return ((data ?? []) as PrivacyRequestRow[]).map(unpack)
}

export async function listPrivacyRequestsAdmin(): Promise<PrivacyRequestRecord[]> {
  const { data, error } = await boardDb()
    .from("privacy_requests")
    .select(select)
    .order("received_at", { ascending: false })
    .limit(250)
  check(error)
  return ((data ?? []) as PrivacyRequestRow[]).map(unpack)
}

export async function updatePrivacyRequest(
  adminId: string,
  requestId: string,
  action: "verify" | "start" | "complete" | "deny",
  resolution: string | null,
) {
  const db = boardDb()
  const now = new Date().toISOString()
  const patch: Record<string, unknown> = {
    updated_at: now,
    last_updated_by: adminId,
    resolution,
  }
  let eventType: "verified" | "started" | "completed" | "denied"
  if (action === "verify") {
    patch.status = "received"
    patch.verified_at = now
    patch.verification_method = "manual"
    eventType = "verified"
  } else if (action === "start") {
    patch.status = "in_progress"
    eventType = "started"
  } else if (action === "complete") {
    patch.status = "completed"
    patch.completed_at = now
    eventType = "completed"
  } else {
    patch.status = "denied"
    patch.completed_at = now
    eventType = "denied"
  }

  const { data, error } = await db
    .from("privacy_requests")
    .update(patch)
    .eq("id", requestId)
    .select(select)
    .maybeSingle()
  check(error)
  if (!data) return { ok: false as const, reason: "Privacy request not found." }

  const { error: eventError } = await db.from("privacy_request_events").insert({
    id: crypto.randomUUID(),
    request_id: requestId,
    actor_user_id: adminId,
    event_type: eventType,
    note: resolution,
  })
  check(eventError)

  return { ok: true as const, value: unpack(data as PrivacyRequestRow) }
}
