import assert from "node:assert/strict"
import { test } from "node:test"

function safeNext(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/account"
  return value
}

test("auth confirm next path rejects open redirects", () => {
  assert.equal(safeNext(null), "/account")
  assert.equal(safeNext("/my-ads"), "/my-ads")
  assert.equal(safeNext("//evil.example"), "/account")
  assert.equal(safeNext("https://evil.example"), "/account")
})

test("phone auth flag is off unless explicitly enabled", () => {
  assert.notEqual(process.env.NEXT_PUBLIC_AUTH_PHONE, "1")
})
