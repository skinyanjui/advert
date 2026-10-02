import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import test from "node:test"
import { PGlite } from "@electric-sql/pglite"
import { canOwner } from "../src/lib/access-control"
import { paymentSupportActionSchema, paymentSupportPolicy, supportVerificationCurrent, validSupportEmail } from "../src/lib/payment-support-policy"

test("payment support requires a real mailbox, a bounded receipt date and an unguessable confirmation", () => {
  assert.equal(validSupportEmail(" Support@my-market.test "), "support@my-market.test")
  for (const value of [undefined, "invalid", "test@example.com", "hi@sub.example.org", "x@localhost", "two@sites.com\nBcc:someone@sites.com"]) assert.equal(validSupportEmail(value), undefined)
  const now = Date.now()
  assert.equal(supportVerificationCurrent(new Date(now - 1000).toISOString(), now), true)
  for (const value of [null, "invalid", new Date(now + 1000).toISOString(), new Date(now - paymentSupportPolicy.verificationDays * 86400000).toISOString()]) assert.equal(supportVerificationCurrent(value, now), false)
  assert.equal(paymentSupportActionSchema.safeParse({ action: "confirm", code: "123456" }).success, false)
  assert.equal(paymentSupportActionSchema.safeParse({ action: "confirm", code: "a".repeat(64) }).success, true)
  assert.equal(canOwner(undefined, "promotion:manage"), false)
  assert.equal(canOwner({ id: "member", kind: "auth", role: "member" }, "promotion:manage"), false)
  assert.equal(canOwner({ id: "admin", kind: "auth", role: "admin" }, "promotion:manage"), true)
})

test("support receipt verification is email-bound, single-use, expiring, throttled and server-only", async () => {
  const db = new PGlite()
  const sql = readFileSync(new URL("../database/migrations/20261002_payment_support.sql", import.meta.url), "utf8")
  const hash = createHash("sha256").update("code only in mailbox").digest("hex")
  try {
    await db.exec("create role anon; create role authenticated; create role service_role bypassrls;")
    await db.exec(sql)
    await db.exec(sql)
    await db.exec("set role service_role")
    await db.query("select request_payment_support_verification($1,$2)", ["support@market.test", hash])
    await assert.rejects(db.query("select request_payment_support_verification($1,$2)", ["support@market.test", hash]), /Wait one minute/)
    async function confirm(email: string, digest = hash) { return (await db.query<{ ok: boolean }>("select confirm_payment_support_verification($1,$2) as ok", [email, digest])).rows[0].ok }
    assert.equal(await confirm("other@market.test"), false)
    assert.equal(await confirm("support@market.test", "b".repeat(64)), false)
    assert.equal(await confirm("support@market.test"), true)
    assert.equal(await confirm("support@market.test"), false)
    await db.exec("update payment_support_verification set requested_at=now()-interval '61 seconds'")
    await db.query("select request_payment_support_verification($1,$2)", ["new@market.test", hash])
    assert.equal((await db.query<{ verified_at: null }>("select verified_at from payment_support_verification")).rows[0].verified_at, null)
    await db.exec("update payment_support_verification set challenge_expires_at=now()-interval '1 second'")
    assert.equal(await confirm("new@market.test"), false)
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`reset role; set role ${role}`)
      await assert.rejects(db.exec("select * from payment_support_verification"), /permission denied/)
      await assert.rejects(db.query("select confirm_payment_support_verification($1,$2)", ["new@market.test", hash]), /permission denied/)
    }
  } finally { await db.close() }
})
