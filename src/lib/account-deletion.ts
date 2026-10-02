import "server-only"

import { boardDb } from "@/lib/board-db"
import { cleanListing } from "@/lib/board-payload"

const retryDelayMs = 5 * 60 * 1000

type DeletionJob = {
  user_id: string
  status: "pending" | "db_cleaned" | "storage_pending" | "auth_pending" | "completed" | "failed"
  avatar_path: string | null
  listing_photo_paths: string[]
  attempts: number
  last_error: string | null
  next_attempt_at: string
  requested_at: string
  db_cleaned_at: string | null
  auth_deleted_at: string | null
  completed_at: string | null
  updated_at: string
}

export type AccountDeletionRequestResult = {
  accepted: true
  completed: boolean
}

function check(error: { message: string } | null | undefined): void {
  if (error) throw new Error(error.message)
}

function avatarStoragePath(image: string | null | undefined): string | null {
  if (!image) return null
  const marker = "/storage/v1/object/public/avatars/"
  const index = image.indexOf(marker)
  if (index < 0) return null
  const path = image.slice(index + marker.length)
  return /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(path) ? path : null
}

function listingPhotoPath(image: string): string | null {
  const marker = "/storage/v1/object/public/listing-photos/"
  const index = image.indexOf(marker)
  if (index < 0) return null
  const path = image.slice(index + marker.length)
  return /^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(path) ? path : null
}

function listingPhotoPaths(payloads: unknown[]): string[] {
  const paths = new Set<string>()
  for (const payload of payloads) {
    const listing = cleanListing(payload)
    if (!listing) continue
    const images = Array.isArray(listing.images) && listing.images.length > 0
      ? listing.images
      : listing.image ? [listing.image] : []
    for (const image of images) {
      const path = listingPhotoPath(image)
      if (path) paths.add(path)
    }
  }
  return [...paths]
}

async function getDeletionJob(userId: string): Promise<DeletionJob | null> {
  const { data, error } = await boardDb()
    .from("board_account_deletion_jobs")
    .select("user_id,status,avatar_path,listing_photo_paths,attempts,last_error,next_attempt_at,requested_at,db_cleaned_at,auth_deleted_at,completed_at,updated_at")
    .eq("user_id", userId)
    .maybeSingle()
  check(error)
  return data ? data as DeletionJob : null
}

export async function isAccountDeletionPending(userId: string): Promise<boolean> {
  const { data, error } = await boardDb().rpc("board_account_deletion_pending", { p_user: userId })
  check(error)
  return data === true
}

async function claimDeletionJob(userId: string): Promise<boolean> {
  const { data, error } = await boardDb().rpc("claim_board_account_deletion", { p_user: userId })
  check(error)
  return data === true
}

async function markFailure(userId: string, error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message.slice(0, 1000) : "Unknown account deletion failure"
  const { error: updateError } = await boardDb()
    .from("board_account_deletion_jobs")
    .update({
      status: "failed",
      last_error: message,
      next_attempt_at: new Date(Date.now() + retryDelayMs).toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
  if (updateError) console.error("Could not persist account deletion failure", { userId, error: updateError })
}

function authAlreadyGone(error: { message?: string; status?: number } | null | undefined): boolean {
  if (!error) return false
  const message = (error.message ?? "").toLowerCase()
  return error.status === 404 || message.includes("not found") || message.includes("user not found")
}

async function removeStorage(job: DeletionJob): Promise<void> {
  const db = boardDb()
  const photoPaths = [...new Set(job.listing_photo_paths ?? [])].filter(Boolean)
  if (photoPaths.length > 0) {
    const { error } = await db.storage.from("listing-photos").remove(photoPaths)
    check(error)
  }
  if (job.avatar_path) {
    const { error } = await db.storage.from("avatars").remove([job.avatar_path])
    check(error)
  }
}

export async function processAccountDeletion(userId: string, alreadyClaimed = false): Promise<{ completed: boolean }> {
  if (!alreadyClaimed && !(await claimDeletionJob(userId))) {
    const existing = await getDeletionJob(userId)
    return { completed: existing?.status === "completed" }
  }

  try {
    let job = await getDeletionJob(userId)
    if (!job) throw new Error("Account deletion job not found")
    if (job.status === "completed") return { completed: true }

    if (job.status === "pending" || job.status === "failed") {
      const { error } = await boardDb().rpc("cleanup_board_account_data", { p_user: userId })
      check(error)
      job = await getDeletionJob(userId)
      if (!job) throw new Error("Account deletion job disappeared during cleanup")
    }

    if (job.status === "db_cleaned" || job.status === "storage_pending") {
      const { error: storageStatusError } = await boardDb()
        .from("board_account_deletion_jobs")
        .update({ status: "storage_pending", updated_at: new Date().toISOString() })
        .eq("user_id", userId)
      check(storageStatusError)
      await removeStorage(job)
      const { error: authStatusError } = await boardDb()
        .from("board_account_deletion_jobs")
        .update({ status: "auth_pending", last_error: null, updated_at: new Date().toISOString() })
        .eq("user_id", userId)
      check(authStatusError)
    }

    const current = await getDeletionJob(userId)
    if (!current) throw new Error("Account deletion job disappeared before Auth cleanup")
    if (current.status === "auth_pending") {
      const { error: authError } = await boardDb().auth.admin.deleteUser(userId)
      if (authError && !authAlreadyGone(authError)) throw new Error(authError.message)
    }

    const completedAt = new Date().toISOString()
    const { error: completedError } = await boardDb()
      .from("board_account_deletion_jobs")
      .update({
        status: "completed",
        auth_deleted_at: completedAt,
        completed_at: completedAt,
        last_error: null,
        updated_at: completedAt,
      })
      .eq("user_id", userId)
    check(completedError)
    return { completed: true }
  } catch (error) {
    await markFailure(userId, error)
    console.error("Account deletion will retry", { userId, error })
    return { completed: false }
  }
}

export async function requestAccountDeletion(userId: string): Promise<AccountDeletionRequestResult> {
  const db = boardDb()
  const { error: beginError } = await db.rpc("begin_board_account_deletion", { p_user: userId })
  check(beginError)

  const [profileResult, listingsResult] = await Promise.all([
    db.from("board_profiles").select("avatar_url").eq("user_id", userId).maybeSingle(),
    db.from("board_listings").select("payload").eq("owner_id", userId),
  ])
  check(profileResult.error)
  check(listingsResult.error)

  const avatarPath = avatarStoragePath(
    typeof profileResult.data?.avatar_url === "string" ? profileResult.data.avatar_url : null,
  )
  const photos = listingPhotoPaths((listingsResult.data ?? []).map((row) => row.payload))
  const { error: resourcesError } = await db.rpc("set_board_account_deletion_resources", {
    p_user: userId,
    p_avatar: avatarPath,
    p_listing_photos: photos,
  })
  check(resourcesError)

  const claimed = await claimDeletionJob(userId)
  if (!claimed) return { accepted: true, completed: false }
  const result = await processAccountDeletion(userId, true)
  return { accepted: true, completed: result.completed }
}

export async function runAccountDeletionRetries(limit = 20): Promise<{ claimed: number; completed: number }> {
  const safeLimit = Math.max(1, Math.min(50, Math.trunc(limit)))
  const { data, error } = await boardDb().rpc("claim_board_account_deletions", { p_limit: safeLimit })
  check(error)
  const ids = ((data ?? []) as { user_id: string }[]).map((row) => row.user_id)
  let completed = 0
  for (const userId of ids) {
    const result = await processAccountDeletion(userId, true)
    if (result.completed) completed += 1
  }
  return { claimed: ids.length, completed }
}

export async function listAccountDeletionJobs(limit = 100) {
  const safeLimit = Math.max(1, Math.min(200, Math.trunc(limit)))
  const { data, error } = await boardDb()
    .from("board_account_deletion_jobs")
    .select("user_id,status,attempts,last_error,next_attempt_at,requested_at,db_cleaned_at,auth_deleted_at,completed_at,updated_at")
    .order("requested_at", { ascending: false })
    .limit(safeLimit)
  check(error)
  return data ?? []
}
