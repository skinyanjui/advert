import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

test("application RBAC separates guest, member, and admin permissions", () => {
  const access = readFileSync(new URL("../src/lib/access-control.ts", import.meta.url), "utf8")
  assert.match(access, /appRoles = \["guest", "member", "admin"\]/)
  assert.match(access, /guest: new Set\(\["browse"\]\)/)
  assert.match(access, /moderation:review/)
  assert.match(access, /privacy:review/)
  assert.match(access, /compliance:manage/)
  assert.match(access, /admin:access/)
  assert.match(access, /admin: new Set\(appPermissions\)/)
  assert.match(access, /if \(!owner \|\| owner\.kind !== "auth"\) return "guest"/)
  assert.match(access, /owner\.role === "admin" \? "admin" : "member"/)

  const rbac = readFileSync(new URL("../src/lib/rbac-store.ts", import.meta.url), "utf8")
  const migration = readFileSync(new URL("../database/migrations/20261001_persisted_rbac.sql", import.meta.url), "utf8")
  assert.match(rbac, /board_user_roles/)
  assert.match(rbac, /isAdminEmail\(email\) \? "admin" : "member"/)
  assert.match(migration, /revoke all on table public\.board_user_roles from anon, authenticated/i)
})

test("guest board payload redacts protected contact and private account state", () => {
  const route = readFileSync(new URL("../src/app/api/board/route.ts", import.meta.url), "utf8")
  assert.match(route, /phone: ""/)
  assert.match(route, /savedIds: \[\]/)
  assert.match(route, /messages: \[\]/)
  assert.match(route, /getTermsStatus/)
  const contact = readFileSync(new URL("../src/app/api/listings/[id]/contact/route.ts", import.meta.url), "utf8")
  assert.match(contact, /resolveOwner\(request\)/)
  assert.match(contact, /requireCurrentTerms\(owner\.id\)/)
  assert.match(contact, /board_contact_reveals/)
  assert.match(contact, /Too many contact lookups/)
})

test("registration discloses protected features and requires legal acceptance", () => {
  const signIn = readFileSync(new URL("../src/components/sign-in-form.tsx", import.meta.url), "utf8")
  const en = readFileSync(new URL("../src/lib/i18n/messages/en.ts", import.meta.url), "utf8")
  assert.match(signIn, /t\("auth\.accountAccessBody"\)/)
  assert.match(signIn, /t\("auth\.mustAgree"\)/)
  assert.match(en, /saving, Messenger, direct seller contact, posting, reporting, profile data/)
  assert.match(en, /Agree to the Terms and acknowledge the Privacy Policy to continue\./)
  assert.match(en, /Confirm that you are at least 18 years old to continue\./)
  assert.match(signIn, /ageConfirmed/)
  assert.match(signIn, /agreedToTerms/)
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


test("promotion operations use persisted-role capability boundaries", async () => {
  const { canOwner } = await import("../src/lib/access-control")
  assert.equal(canOwner(undefined, "promotion:manage"), false)
  assert.equal(canOwner({ id: "buyer", kind: "session" }, "promotion:manage"), false)
  assert.equal(canOwner({ id: "member", kind: "auth", role: "member", email: "admin@example.com" }, "promotion:manage"), false)
  assert.equal(canOwner({ id: "admin", kind: "auth", role: "admin" }, "promotion:manage"), true)
  const route = readFileSync(new URL("../src/app/api/admin/promotions/route.ts", import.meta.url), "utf8")
  assert.equal((route.match(/canOwner\(owner, "promotion:manage"\)/g) ?? []).length, 2)
  assert.match(route, /resolveMutationOwner\(request\)/)
  const page = readFileSync(new URL("../src/lib/promotion-page-access.ts", import.meta.url), "utf8")
  assert.match(page, /resolvePersistedRole\(user.id, user.email\)/)
  assert.doesNotMatch(page, /isAdminEmail/)
})
