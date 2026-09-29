import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

test("application RBAC separates guest, member, and admin permissions", () => {
  const access = readFileSync(new URL("../src/lib/access-control.ts", import.meta.url), "utf8")
  assert.match(access, /appRoles = \["guest", "member", "admin"\]/)
  assert.match(access, /guest: new Set\(\["browse"\]\)/)
  assert.match(access, /member: new Set\(\["browse", "contact:direct", "message", "save", "report", "post", "profile"\]\)/)
  assert.match(access, /admin: new Set\(appPermissions\)/)
  assert.match(access, /if \(!owner \|\| owner\.kind !== "auth"\) return "guest"/)
  assert.match(access, /isAdminEmail\(owner\.email\) \? "admin" : "member"/)
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


test("protected mutations require RBAC and current legal acceptance", () => {
  const board = readFileSync(new URL("../src/app/api/board/route.ts", import.meta.url), "utf8")
  const listing = readFileSync(new URL("../src/app/api/listings/[id]/route.ts", import.meta.url), "utf8")
  const contributing = readFileSync(new URL("../CONTRIBUTING.md", import.meta.url), "utf8")

  assert.match(board, /canOwner\(owner, "profile"\)/)
  assert.match(board, /requireCurrentTerms\(owner\.id\)/)
  assert.match(listing, /canOwner\(owner, "post"\)/)
  assert.equal((listing.match(/requireCurrentTerms\(owner\.id\)/g) ?? []).length, 2)
  assert.match(contributing, /role-based access control as a default requirement/i)
  assert.match(contributing, /UI visibility is never the security boundary/i)
})
