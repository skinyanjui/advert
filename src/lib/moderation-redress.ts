import "server-only"

import { boardDb } from "@/lib/board-db"

export type ModerationAppealStatus = "pending" | "upheld" | "reversed"

export type ModerationAppealRecord = {
  id: string
  moderationActionId: string
  appellantUserId: string
  reason: string
  status: ModerationAppealStatus
  submittedAt: string
  reviewedAt: string | null
  resolution: string | null
}

export type ModerationDecisionRecord = {
  id: string
  listingId: string | null
  listingTitle: string | null
  action: string
  restrictionType: string | null
  decisionReason: string | null
  policyBasis: string | null
  automated: boolean
  createdAt: string
  notifiedAt: string | null
  appealUntil: string | null
  appeal: ModerationAppealRecord | null
}

type ActionRow = {
  id: string
  listing_id: string | null
  listing_title: string | null
  subject_user_id: string | null
  action: string
  restriction_type: string | null
  decision_reason: string | null
  policy_basis: string | null
  automated: boolean
  created_at: string
  notified_at: string | null
  appeal_until: string | null
}

type AppealRow = {
  id: string
  moderation_action_id: string
  appellant_user_id: string
  reason: string
  status: ModerationAppealStatus
  submitted_at: string
  reviewed_at: string | null
  resolution: string | null
}

function check(error: { message: string } | null) {
  if (error) throw new Error(error.message)
}

function appealUntilFrom(now = new Date()): string {
  const until = new Date(now)
  until.setUTCMonth(until.getUTCMonth() + 6)
  return until.toISOString()
}

function unpackAppeal(row: AppealRow): ModerationAppealRecord {
  return {
    id: row.id,
    moderationActionId: row.moderation_action_id,
    appellantUserId: row.appellant_user_id,
    reason: row.reason,
    status: row.status,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
    resolution: row.resolution,
  }
}

async function appealsByAction(actionIds: string[]): Promise<Map<string, ModerationAppealRecord>> {
  if (actionIds.length === 0) return new Map()
  const { data, error } = await boardDb()
    .from("moderation_appeals")
    .select("id,moderation_action_id,appellant_user_id,reason,status,submitted_at,reviewed_at,resolution")
    .in("moderation_action_id", actionIds)
    .order("submitted_at", { ascending: false })
  check(error)
  const map = new Map<string, ModerationAppealRecord>()
  for (const row of (data ?? []) as AppealRow[]) {
    if (!map.has(row.moderation_action_id)) map.set(row.moderation_action_id, unpackAppeal(row))
  }
  return map
}

export async function listModerationDecisionsForUser(userId: string): Promise<ModerationDecisionRecord[]> {
  const db = boardDb()
  const { data, error } = await db
    .from("moderation_actions")
    .select("id,listing_id,listing_title,subject_user_id,action,restriction_type,decision_reason,policy_basis,automated,created_at,notified_at,appeal_until")
    .eq("subject_user_id", userId)
    .in("restriction_type", ["visibility_restricted", "content_removed"])
    .order("created_at", { ascending: false })
    .limit(100)
  check(error)

  const rows = (data ?? []) as ActionRow[]
  const now = new Date()
  const unnotified = rows.filter((row) => !row.notified_at)
  if (unnotified.length > 0) {
    for (const row of unnotified) {
      const notifiedAt = now.toISOString()
      const appealUntil = appealUntilFrom(now)
      const { error: updateError } = await db
        .from("moderation_actions")
        .update({ notified_at: notifiedAt, appeal_until: appealUntil })
        .eq("id", row.id)
        .eq("subject_user_id", userId)
        .is("notified_at", null)
      check(updateError)
      row.notified_at = notifiedAt
      row.appeal_until = appealUntil
    }
  }

  const appeals = await appealsByAction(rows.map((row) => row.id))
  return rows.map((row) => ({
    id: row.id,
    listingId: row.listing_id,
    listingTitle: row.listing_title,
    action: row.action,
    restrictionType: row.restriction_type,
    decisionReason: row.decision_reason,
    policyBasis: row.policy_basis,
    automated: row.automated,
    createdAt: row.created_at,
    notifiedAt: row.notified_at,
    appealUntil: row.appeal_until,
    appeal: appeals.get(row.id) ?? null,
  }))
}

export async function submitModerationAppeal(
  userId: string,
  moderationActionId: string,
  reason: string,
) {
  const db = boardDb()
  const { data: action, error } = await db
    .from("moderation_actions")
    .select("id,subject_user_id,appeal_until,restriction_type")
    .eq("id", moderationActionId)
    .eq("subject_user_id", userId)
    .maybeSingle()
  check(error)
  if (!action) return { ok: false as const, reason: "That moderation decision was not found." }
  if (!["visibility_restricted", "content_removed"].includes(action.restriction_type as string)) {
    return { ok: false as const, reason: "That decision is not appealable through this form." }
  }
  const appealUntil = action.appeal_until as string | null
  if (!appealUntil || new Date(appealUntil).getTime() < Date.now()) {
    return { ok: false as const, reason: "The in-product appeal period for this decision has ended." }
  }
  const cleanReason = reason.trim()
  if (cleanReason.length < 10) {
    return { ok: false as const, reason: "Add enough detail for a reviewer to understand the appeal." }
  }
  if (cleanReason.length > 2500) {
    return { ok: false as const, reason: "Keep the appeal under 2,500 characters." }
  }

  const { data: existing, error: existingError } = await db
    .from("moderation_appeals")
    .select("id,status")
    .eq("moderation_action_id", moderationActionId)
    .eq("appellant_user_id", userId)
    .eq("status", "pending")
    .maybeSingle()
  check(existingError)
  if (existing) return { ok: false as const, reason: "An appeal for this decision is already pending." }

  const { data, error: insertError } = await db
    .from("moderation_appeals")
    .insert({
      id: crypto.randomUUID(),
      moderation_action_id: moderationActionId,
      appellant_user_id: userId,
      reason: cleanReason,
      status: "pending",
    })
    .select("id,moderation_action_id,appellant_user_id,reason,status,submitted_at,reviewed_at,resolution")
    .single()
  check(insertError)
  return { ok: true as const, value: unpackAppeal(data as AppealRow) }
}

export type AdminModerationAppeal = ModerationAppealRecord & {
  listingId: string | null
  listingTitle: string | null
  decisionReason: string | null
  policyBasis: string | null
  restrictionType: string | null
  decisionCreatedAt: string
}

export async function listModerationAppealsAdmin(): Promise<AdminModerationAppeal[]> {
  const db = boardDb()
  const { data, error } = await db
    .from("moderation_appeals")
    .select("id,moderation_action_id,appellant_user_id,reason,status,submitted_at,reviewed_at,resolution")
    .order("submitted_at", { ascending: false })
    .limit(250)
  check(error)
  const appeals = (data ?? []) as AppealRow[]
  if (appeals.length === 0) return []
  const actionIds = [...new Set(appeals.map((row) => row.moderation_action_id))]
  const { data: actionsData, error: actionsError } = await db
    .from("moderation_actions")
    .select("id,listing_id,listing_title,decision_reason,policy_basis,restriction_type,created_at")
    .in("id", actionIds)
  check(actionsError)
  const actions = new Map(
    (actionsData ?? []).map((row) => [
      row.id as string,
      {
        listingId: row.listing_id as string | null,
        listingTitle: row.listing_title as string | null,
        decisionReason: row.decision_reason as string | null,
        policyBasis: row.policy_basis as string | null,
        restrictionType: row.restriction_type as string | null,
        decisionCreatedAt: row.created_at as string,
      },
    ]),
  )
  return appeals.flatMap((row) => {
    const action = actions.get(row.moderation_action_id)
    if (!action) return []
    return [{ ...unpackAppeal(row), ...action }]
  })
}

export async function reviewModerationAppeal(
  adminId: string,
  appealId: string,
  outcome: "uphold" | "reverse",
  resolution: string,
) {
  const db = boardDb()
  const { data: appeal, error } = await db
    .from("moderation_appeals")
    .select("id,moderation_action_id,appellant_user_id,status")
    .eq("id", appealId)
    .maybeSingle()
  check(error)
  if (!appeal) return { ok: false as const, reason: "Appeal not found." }
  if (appeal.status !== "pending") return { ok: false as const, reason: "That appeal was already reviewed." }

  const { data: action, error: actionError } = await db
    .from("moderation_actions")
    .select("id,listing_id,listing_title,subject_user_id,restriction_type")
    .eq("id", appeal.moderation_action_id)
    .maybeSingle()
  check(actionError)
  if (!action) return { ok: false as const, reason: "The original moderation decision was not found." }

  const now = new Date().toISOString()
  const nextStatus: ModerationAppealStatus = outcome === "reverse" ? "reversed" : "upheld"
  const { error: updateError } = await db
    .from("moderation_appeals")
    .update({
      status: nextStatus,
      reviewed_at: now,
      reviewed_by: adminId,
      resolution: resolution.trim().slice(0, 2500),
    })
    .eq("id", appealId)
    .eq("status", "pending")
  check(updateError)

  if (outcome === "reverse" && action.listing_id) {
    const { error: restoreError } = await db
      .from("board_listings")
      .update({ hidden_at: null, hidden_reason: null })
      .eq("id", action.listing_id)
      .eq("hidden_reason", "admin")
    check(restoreError)

    const { error: logError } = await db.from("moderation_actions").insert({
      id: crypto.randomUUID(),
      report_id: null,
      listing_id: action.listing_id,
      admin_id: adminId,
      action: "appeal_reverse",
      note: resolution.trim().slice(0, 2500),
      subject_user_id: action.subject_user_id,
      listing_title: action.listing_title,
      restriction_type: "no_restriction",
      decision_reason: resolution.trim().slice(0, 1500),
      policy_basis: "Internal moderation appeal",
      automated: false,
      notified_at: now,
    })
    check(logError)
  }

  return { ok: true as const }
}
