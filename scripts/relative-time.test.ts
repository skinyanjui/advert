import assert from "node:assert/strict"
import { test } from "node:test"

import { hoursAgoOf } from "../src/lib/format"
import {
  formatMessageWhen,
  formatPostedDate,
  formatRelativePosted,
  postedDateTime,
  relativePostedLabel,
} from "../src/lib/relative-time"

test("formatRelativePosted compact units", () => {
  assert.equal(formatRelativePosted(0), "Just now")
  assert.equal(formatRelativePosted(0.4), "Just now")
  assert.equal(formatRelativePosted(1), "Posted 1h ago")
  assert.equal(formatRelativePosted(3.2), "Posted 3h ago")
  assert.equal(formatRelativePosted(23), "Posted 23h ago")
  assert.equal(formatRelativePosted(24), "Posted 1d ago")
  assert.equal(formatRelativePosted(36), "Posted 2d ago")
  assert.equal(formatRelativePosted(6 * 24), "Posted 6d ago")
  assert.equal(formatRelativePosted(7 * 24), "Posted 1w ago")
  assert.equal(formatRelativePosted(14 * 24), "Posted 2w ago")
  assert.equal(formatRelativePosted(60 * 24), "Posted 2mo ago")
})

test("formatRelativePosted guards bad input", () => {
  assert.equal(formatRelativePosted(-1), "Just now")
  assert.equal(formatRelativePosted(Number.NaN), "Just now")
})

test("relativePostedLabel uses hoursAgoOf", () => {
  const now = Date.parse("2026-09-28T12:00:00.000Z")
  assert.equal(relativePostedLabel({ hoursAgo: 2 }, now), "Posted 2h ago")
  assert.equal(
    relativePostedLabel({ hoursAgo: 99, postedAt: "2026-09-26T12:00:00.000Z" }, now),
    "Posted 2d ago",
  )
  assert.equal(hoursAgoOf({ hoursAgo: 5, postedAt: "not-a-date" }, now), 5)
})

test("formatPostedDate and postedDateTime", () => {
  assert.equal(formatPostedDate(undefined), undefined)
  assert.equal(formatPostedDate("bad"), undefined)
  assert.match(formatPostedDate("2026-09-01T10:00:00.000Z") ?? "", /2026/)
  assert.equal(postedDateTime({}), undefined)
  assert.equal(postedDateTime({ postedAt: "2026-09-01T10:00:00.000Z" }), "2026-09-01T10:00:00.000Z")
})

test("formatMessageWhen uses formatPosted for inbox stamps", () => {
  const now = Date.parse("2026-09-28T12:00:00.000Z")
  assert.equal(formatMessageWhen("bad", "en", now), "")
  assert.equal(formatMessageWhen("2026-09-28T11:30:00.000Z", "en", now), "Just now")
  assert.equal(formatMessageWhen("2026-09-28T09:00:00.000Z", "en", now), "3 hours ago")
  assert.equal(formatMessageWhen("2026-09-26T12:00:00.000Z", "en", now), "2 days ago")
})
