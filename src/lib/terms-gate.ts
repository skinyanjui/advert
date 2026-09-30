import "server-only"

import { fail } from "@/lib/api"
import { boardDb } from "@/lib/board-db"
import {
  LEGAL_DISCLOSURE_VERSION,
  PRIVACY_VERSION,
  TERMS_OUTDATED_MESSAGE,
  TERMS_VERSION,
} from "@/lib/legal"
import type { NextResponse } from "next/server"

export { TERMS_OUTDATED_MESSAGE }

function isMissingRelationError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false
  const code = error.code ?? ""
  const message = (error.message ?? "").toLowerCase()
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    (message.includes("terms_acceptances") && message.includes("does not exist")) ||
    message.includes("could not find the table")
  )
}

export type TermsStatus = {
  current: boolean
  termsVersion: string
  privacyVersion: string
  acceptedTermsVersion: string | null
  acceptedPrivacyVersion: string | null
  /** True when the acceptances table is missing — gate is a no-op. */
  tableMissing: boolean
}

export async function getTermsStatus(userId: string): Promise<TermsStatus> {
  const base: TermsStatus = {
    current: true,
    termsVersion: TERMS_VERSION,
    privacyVersion: PRIVACY_VERSION,
    acceptedTermsVersion: null,
    acceptedPrivacyVersion: null,
    tableMissing: false,
  }
  try {
    const { data, error } = await boardDb()
      .from("terms_acceptances")
      .select("terms_version,privacy_version,age_attested,privacy_acknowledged,disclosure_version,accepted_at")
      .eq("user_id", userId)
      .order("accepted_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) {
      if (isMissingRelationError(error)) return { ...base, tableMissing: true, current: true }
      throw new Error(error.message)
    }
    if (!data) {
      return { ...base, current: false }
    }
    const acceptedTermsVersion = typeof data.terms_version === "string" ? data.terms_version : null
    const acceptedPrivacyVersion = typeof data.privacy_version === "string" ? data.privacy_version : null
    const current =
      acceptedTermsVersion === TERMS_VERSION &&
      acceptedPrivacyVersion === PRIVACY_VERSION &&
      data.age_attested === true &&
      data.privacy_acknowledged === true &&
      data.disclosure_version === LEGAL_DISCLOSURE_VERSION
    return {
      ...base,
      current,
      acceptedTermsVersion,
      acceptedPrivacyVersion,
    }
  } catch (error) {
    if (isMissingRelationError(error as { code?: string; message?: string })) {
      return { ...base, tableMissing: true, current: true }
    }
    throw error
  }
}

/** Returns a 428 response when the user's latest acceptance is not current. No-op if the table is missing. */
export async function requireCurrentTerms(userId: string): Promise<NextResponse | null> {
  const status = await getTermsStatus(userId)
  if (status.tableMissing || status.current) return null
  return fail(TERMS_OUTDATED_MESSAGE, 428)
}
