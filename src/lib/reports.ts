import { translate, type MessageKey } from "@/lib/i18n"
import type { Locale } from "@/lib/i18n/locales"

export const reportReasons = [
  { id: "spam", label: "Spam or advertising" },
  { id: "scam", label: "Scam or fraud" },
  { id: "prohibited", label: "Prohibited item or service" },
  { id: "wrong_category", label: "Wrong category" },
  { id: "offensive", label: "Offensive or abusive" },
  { id: "undisclosed_promo", label: "Undisclosed paid promotion" },
  { id: "other", label: "Something else" },
] as const

export type ReportReasonId = (typeof reportReasons)[number]["id"]

const reasonIds = new Set<string>(reportReasons.map((item) => item.id))

const reasonKeys = {
  spam: "report.reason.spam",
  scam: "report.reason.scam",
  prohibited: "report.reason.prohibited",
  wrong_category: "report.reason.wrong_category",
  offensive: "report.reason.offensive",
  undisclosed_promo: "report.reason.undisclosed_promo",
  other: "report.reason.other",
} as const satisfies Record<ReportReasonId, MessageKey>

export function isReportReasonId(value: string | null | undefined): value is ReportReasonId {
  return !!value && reasonIds.has(value)
}

export function reportReasonLabel(id: ReportReasonId, locale: Locale = "en"): string {
  return translate(locale, reasonKeys[id])
}

export function reportNoteError(note: string): string | undefined {
  const text = note.trim()
  if (text.length > 500) return "Keep the note under 500 characters."
  return undefined
}

/** Distinct pending reports that auto-hide an ad. Override with REPORT_AUTO_HIDE_THRESHOLD. */
export function reportAutoHideThreshold(): number {
  const raw = process.env.REPORT_AUTO_HIDE_THRESHOLD
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN
  if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 50) return parsed
  return 3
}
