import "server-only"

import { boardDb } from "@/lib/board-db"
import { cleanListing } from "@/lib/board-payload"
import type { Listing } from "@/lib/types"

type DeletionJobRow = {
  user_id: string
  status: "pending" | "running" | "finalizing" | "complete"
  attempts: number
  resources: unknown
}

type DeletionResources = {
  listingIds: string[]
  conversationIds: string[]
  listingPhotoPaths: string[]
  avatarPaths: string[]
}

type CleanupIssue = {
  step: string
  message: string
  ids?: string[]
}

export type AccountDeletionResult =
  | { ok: true; completed: true }
  | { ok: true; completed: false; reason: string }
  | { ok: false; reason: string }

const missingRelationCodes = new Set(["42P01", "PGRST205"])

function isMissingRelation(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false
  return missingRelationCodes.has(error.code ?? "") ||
    (error.message ?? "").toLowerCase().includes("account_deletion_jobs")
}

function emptyResources(): DeletionResources {
  return { listingIds: [], conversationIds: [], listingPhotoPaths: [], avatarPaths: [] }
}

function arrayOfStrings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []
}

function parseResources(value: unknown): DeletionResources {
  if (!value || typeof value !== "object") return emptyResources()
  const object = value as Record<string, unknown>
  return {
    listingIds: arrayOfStrings(object.listingIds),
    conversationIds: arrayOfStrings(object.conversationIds),
    listingPhotoPaths: arrayOfStrings(object.listingPhotoPaths),
    avatarPaths: arrayOfStrings(object.avatarPaths),
  }
}

function mergeUnique(...values: string[][]) {
  return [...new Set(values.flat().filter(Boolean))]
}

function avatarStoragePath(image: string | null | undefined) {
  if (!image) return undefined
  const marker = "/storage/v1/object/public/avatars/"
  const index = image.indexOf(marker)
  if (index < 0) return undefined
  const path = image.slice(index + marker.length)
  return /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(path) ? path : undefined
}

function listingPhotoPath(image: string) {
  const marker = "/storage/v1/object/public/listing-photos/"
  const index = image.indexOf(marker)
  if (index < 0) return undefined
  const path = image.slice(index + marker.length)
  return /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(path) ? path : undefined
}

function listingPhotoPaths(listing: Listing | undefined) {
  if (!listing) return []
  const images = Array.isArray(listing.images) && listing.images.length > 0
    ? listing.images
    : listing.image
      ? [listing.image]
      : []
  return images.map(listingPhotoPath).filter((path): path is string => Boolean(path))
}

async function readJob(userId: string): Promise<DeletionJobRow | null> {
  const { data, error } = await boardDb()
    .from("account_deletion_jobs")
    .select("user_id,status,attempts,resources")
    .eq("user_id", userId)
    .maybeSingle()
  if (error) {
    if (isMissingRelation(error)) return null
    throw new Error(error.message)
  }
  return data as DeletionJobRow | null
}

export async function accountDeletionPending(userId: string): Promise<boolean> {
  const job = await readJob(userId)
  return Boolean(job && job.status !== "complete")
}

async function ensureJob(userId: string) {
  const now = new Date().toISOString()
  const { error } = await boardDb().from("account_deletion_jobs").upsert({
    user_id: userId,
    status: "pending",
    requested_at: now,
    updated_at: now,
  }, { onConflict: "user_id", ignoreDuplicates: true })
  if (error) {
    if (isMissingRelation(error)) throw new Error("Account deletion queue is unavailable.")
    throw new Error(error.message)
  }
}

async function currentResources(userId: string, prior: DeletionResources): Promise<DeletionResources> {
  const db = boardDb()
  const [{ data: profile, error: profileError }, { data: listings, error: listingsError }, { data: conversations, error: conversationsError }] = await Promise.all([
    db.from("board_profiles").select("avatar_url").eq("user_id", userId).maybeSingle(),
    db.from("board_listings").select("id,payload").eq("owner_id", userId),
    db.from("board_conversations").select("id").or(`buyer_id.eq.${userId},listing_owner_id.eq.${userId}`),
  ])
  if (profileError) throw new Error(profileError.message)
  if (listingsError) throw new Error(listingsError.message)
  if (conversationsError) throw new Error(conversationsError.message)

  const listingIds = (listings ?? []).map((row) => String(row.id))
  const conversationIds = (conversations ?? []).map((row) => String(row.id))
  const photoPaths = (listings ?? []).flatMap((row) => listingPhotoPaths(cleanListing(row.payload)))
  const avatarPath = avatarStoragePath(typeof profile?.avatar_url === "string" ? profile.avatar_url : null)

  return {
    listingIds: mergeUnique(prior.listingIds, listingIds),
    conversationIds: mergeUnique(prior.conversationIds, conversationIds),
    listingPhotoPaths: mergeUnique(prior.listingPhotoPaths, photoPaths),
    avatarPaths: mergeUnique(prior.avatarPaths, avatarPath ? [avatarPath] : []),
  }
}

async function removeStorage(bucket: string, paths: string[], issues: CleanupIssue[]) {
  if (paths.length === 0) return
  const { error } = await boardDb().storage.from(bucket).remove(paths)
  if (error) issues.push({ step: `${bucket}_storage`, message: error.message, ids: paths })
}

async function cleanupDatabase(userId: string, resources: DeletionResources, issues: CleanupIssue[]) {
  const db = boardDb()
  const record = (step: string, error: { message: string; code?: string } | null, ids?: string[]) => {
    if (error && !missingRelationCodes.has(error.code ?? "")) issues.push({ step, message: error.message, ids })
  }

  record("promotion_notifications", (await db.from("board_promotion_notifications").delete().eq("owner_id", userId)).error, [userId])

  if (resources.listingIds.length > 0) {
    record("listing_saves", (await db.from("board_saves").delete().in("listing_id", resources.listingIds)).error, resources.listingIds)
  }
  record("owner_saves", (await db.from("board_saves").delete().eq("owner_id", userId)).error, [userId])
  record("legacy_messages", (await db.from("board_messages").delete().eq("owner_id", userId)).error, [userId])
  record("reports", (await db.from("board_reports").delete().eq("reporter_id", userId)).error, [userId])
  record("reports_reviewed_by", (await db.from("board_reports").update({ reviewed_by: null }).eq("reviewed_by", userId)).error, [userId])
  record("contact_events", (await db.from("board_contact_events").delete().eq("actor_id", userId).eq("actor_kind", "auth")).error, [userId])
  record("contact_reveals_viewer", (await db.from("board_contact_reveals").delete().eq("viewer_id", userId)).error, [userId])
  if (resources.listingIds.length > 0) {
    record("contact_reveals_listings", (await db.from("board_contact_reveals").delete().in("listing_id", resources.listingIds)).error, resources.listingIds)
  }
  record("whatsapp_consents", (await db.from("board_whatsapp_consents").delete().or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)).error, [userId])

  if (resources.conversationIds.length > 0) {
    record("conversations", (await db.from("board_conversations").delete().in("id", resources.conversationIds)).error, resources.conversationIds)
  }
  record("listings", (await db.from("board_listings").delete().eq("owner_id", userId)).error, resources.listingIds)
  record("profile", (await db.from("board_profiles").delete().eq("user_id", userId)).error, [userId])
}

function retryAt(attempts: number) {
  const minutes = Math.min(24 * 60, Math.max(5, 5 * 2 ** Math.min(attempts, 8)))
  return new Date(Date.now() + minutes * 60_000).toISOString()
}

async function saveFailure(userId: string, attempts: number, resources: DeletionResources, issues: CleanupIssue[]) {
  const now = new Date().toISOString()
  const { error } = await boardDb().from("account_deletion_jobs").update({
    status: "pending",
    attempts,
    resources,
    last_error: issues,
    last_attempt_at: now,
    next_attempt_at: retryAt(attempts),
    updated_at: now,
  }).eq("user_id", userId)
  if (error) throw new Error(error.message)
}

export async function processAccountDeletion(userId: string): Promise<AccountDeletionResult> {
  const db = boardDb()
  const existing = await readJob(userId)
  if (!existing) return { ok: false, reason: "Account deletion queue is unavailable." }
  if (existing.status === "complete") return { ok: true, completed: true }

  const attempts = existing.attempts + 1
  const now = new Date().toISOString()
  const start = await db.from("account_deletion_jobs").update({
    status: "running",
    attempts,
    last_attempt_at: now,
    updated_at: now,
  }).eq("user_id", userId)
  if (start.error) throw new Error(start.error.message)

  let resources = parseResources(existing.resources)
  try {
    resources = await currentResources(userId, resources)
    const saved = await db.from("account_deletion_jobs").update({ resources, updated_at: new Date().toISOString() }).eq("user_id", userId)
    if (saved.error) throw new Error(saved.error.message)
  } catch (error) {
    const issues = [{ step: "inventory", message: error instanceof Error ? error.message : "Inventory failed." }]
    await saveFailure(userId, attempts, resources, issues)
    return { ok: true, completed: false, reason: "Account deletion is queued and will retry automatically." }
  }

  const issues: CleanupIssue[] = []
  await removeStorage("listing-photos", resources.listingPhotoPaths, issues)
  await removeStorage("avatars", resources.avatarPaths, issues)
  await cleanupDatabase(userId, resources, issues)

  if (issues.length > 0) {
    console.error("Account deletion cleanup deferred", { userId, attempts, issues })
    await saveFailure(userId, attempts, resources, issues)
    return { ok: true, completed: false, reason: "Account deletion is queued and will retry automatically." }
  }

  const finalizing = await db.from("account_deletion_jobs").update({
    status: "finalizing",
    last_error: null,
    next_attempt_at: null,
    updated_at: new Date().toISOString(),
  }).eq("user_id", userId)
  if (finalizing.error) throw new Error(finalizing.error.message)

  const { error: authError } = await db.auth.admin.deleteUser(userId)
  const authStatus = (authError as { status?: number } | null)?.status
  if (authError && authStatus !== 404) {
    const authIssues = [{ step: "auth_user", message: authError.message, ids: [userId] }]
    console.error("Account deletion auth removal deferred", { userId, attempts, error: authError })
    await saveFailure(userId, attempts, resources, authIssues)
    return { ok: true, completed: false, reason: "Account deletion is queued and will retry automatically." }
  }

  const complete = await db.from("account_deletion_jobs").update({
    status: "complete",
    completed_at: new Date().toISOString(),
    last_error: null,
    next_attempt_at: null,
    updated_at: new Date().toISOString(),
  }).eq("user_id", userId)
  if (complete.error) throw new Error(complete.error.message)
  return { ok: true, completed: true }
}

export async function requestAccountDeletion(userId: string): Promise<AccountDeletionResult> {
  await ensureJob(userId)
  return processAccountDeletion(userId)
}

export async function retryDueAccountDeletions(limit = 20) {
  const db = boardDb()
  const now = new Date().toISOString()
  const { data, error } = await db.from("account_deletion_jobs")
    .select("user_id")
    .neq("status", "complete")
    .or(`next_attempt_at.is.null,next_attempt_at.lte.${now}`)
    .order("requested_at", { ascending: true })
    .limit(Math.max(1, Math.min(100, limit)))
  if (error) {
    if (isMissingRelation(error)) return { processed: 0, completed: 0, pending: 0 }
    throw new Error(error.message)
  }
  let completed = 0
  let pending = 0
  for (const row of data ?? []) {
    const result = await processAccountDeletion(String(row.user_id))
    if (result.ok && result.completed) completed += 1
    else pending += 1
  }
  return { processed: (data ?? []).length, completed, pending }
}

export async function listAccountDeletionJobs() {
  const { data, error } = await boardDb().from("account_deletion_jobs")
    .select("user_id,status,attempts,requested_at,last_attempt_at,next_attempt_at,completed_at,last_error")
    .order("requested_at", { ascending: false })
    .limit(100)
  if (error) {
    if (isMissingRelation(error)) return []
    throw new Error(error.message)
  }
  return data ?? []
}
