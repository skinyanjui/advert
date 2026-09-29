import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

import { can, roleForOwner } from "../src/lib/access-control"

test("application RBAC separates guest, member, and admin permissions", () => {
  assert.equal(roleForOwner(undefined), "guest")
  assert.equal(roleForOwner({ id: "session", kind: "session" }), "guest")
  assert.equal(can("guest", "browse"), true)
  assert.equal(can("guest", "message"), false)
  assert.equal(can("guest", "contact:direct"), false)
  assert.equal(can("guest", "save"), false)
  assert.equal(can("member", "message"), true)
  assert.equal(can("member", "profile"), true)
  assert.equal(can("member", "admin"), false)
  assert.equal(can("admin", "admin"), true)
})

test("guest board payload redacts protected contact and private account state", () => {
  const route = readFileSync(new URL("../src/app/api/board/route.ts", import.meta.url), "utf8")
  assert.match(route, /phone: ""/)
  assert.match(route, /contactPhone: false/)
  assert.match(route, /contactWhatsApp: false/)
  assert.match(route, /savedIds: \[\]/)
  assert.match(route, /messages: \[\]/)
  assert.match(route, /getTermsStatus/)
})

test("registration discloses protected features and requires legal acceptance", () => {
  const signIn = readFileSync(new URL("../src/components/sign-in-form.tsx", import.meta.url), "utf8")
  assert.match(signIn, /saving, messaging, direct seller contact, posting, reporting, profile data/)
  assert.match(signIn, /Agree to the Terms and Privacy Policy to continue\./)
  assert.match(signIn, /channel === "phone"/)
})
