import assert from "node:assert/strict"
import { test } from "node:test"

import {
  isReportReasonId,
  reportAutoHideThreshold,
  reportNoteError,
  reportReasons,
} from "../src/lib/reports"

test("report reasons cover the expected ids", () => {
  assert.ok(reportReasons.length >= 4)
  assert.equal(isReportReasonId("scam"), true)
  assert.equal(isReportReasonId("undisclosed_promo"), true)
  assert.equal(isReportReasonId("discrimination"), true)
  assert.equal(
    reportReasons.some((item) => item.id === "undisclosed_promo" && item.label === "Undisclosed paid promotion"),
    true,
  )
  assert.equal(isReportReasonId("not-a-reason"), false)
})

test("report note length is capped", () => {
  assert.equal(reportNoteError("ok"), undefined)
  assert.equal(reportNoteError("x".repeat(501)), "Keep the note under 500 characters.")
})

test("auto-hide threshold defaults to 3", () => {
  const previous = process.env.REPORT_AUTO_HIDE_THRESHOLD
  delete process.env.REPORT_AUTO_HIDE_THRESHOLD
  assert.equal(reportAutoHideThreshold(), 3)
  process.env.REPORT_AUTO_HIDE_THRESHOLD = "5"
  assert.equal(reportAutoHideThreshold(), 5)
  process.env.REPORT_AUTO_HIDE_THRESHOLD = "0"
  assert.equal(reportAutoHideThreshold(), 3)
  if (previous === undefined) delete process.env.REPORT_AUTO_HIDE_THRESHOLD
  else process.env.REPORT_AUTO_HIDE_THRESHOLD = previous
})
