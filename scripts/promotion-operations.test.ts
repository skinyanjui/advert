import assert from "node:assert/strict"
import test from "node:test"
import { readFileSync } from "node:fs"
import { PGlite } from "@electric-sql/pglite"
import { emailTextToHtml } from "../src/lib/email-content"
import { marketplacePolicy } from "../src/lib/marketplace-policy"
import { promotionNotificationMessage, promotionReviewOverdue } from "../src/lib/promotion-notifications"

const owner = "00000000-0000-4000-8000-000000000001"
const actor = "00000000-0000-4000-8000-000000000002"
const migration = readFileSync(new URL("../database/migrations/20261002_promotion_operations.sql", import.meta.url), "utf8")

test("promotion operational policy matches migration limits", () => {
  assert.match(migration, new RegExp(`interval '${marketplacePolicy.promotions.reviewHours} hours'`))
  assert.match(migration, new RegExp(`refund_attempts < ${marketplacePolicy.promotions.maxRefundAttempts}`))
  assert.match(migration, new RegExp(`attempts < ${marketplacePolicy.promotions.maxNotificationAttempts}`))
  assert.match(migration, new RegExp(`interval '${marketplacePolicy.promotions.retentionDays} days'`))
})

test("payment, decisions and refund failures enqueue durable notices exactly once; workers lease and bound retries", async () => {
  const db = new PGlite()
  try {
    await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
      create table board_listings(id text primary key,owner_id uuid not null,status text default 'active',expires_at timestamptz default now()+interval '60 days',hidden_at timestamptz);
      grant all on board_listings to service_role;
      insert into board_listings(id,owner_id) values('ad-test','${owner}');`)
    await db.exec(readFileSync(new URL("../database/migrations/20261002_featured_promotions.sql", import.meta.url), "utf8"))
    await db.exec(migration)
    await db.exec(migration)
    const row = (await db.query<{ id: string }>("select * from request_board_promotion('ad-test',$1)", [owner])).rows[0]
    const chosen = async (language: string) => (await db.query<{ language: string }>("select resolve_board_promotion_checkout_language($1,$2,$3) as language", [row.id, owner, language])).rows[0].language
    assert.equal(await chosen("fr"), "fr")
    assert.equal(await chosen("sw"), "fr", "provider retries retain the first checkout language")
    await assert.rejects(db.query("select resolve_board_promotion_checkout_language($1,$2,'en')", [row.id, actor]), /not owned/)
    const pay = () => db.query("select pay_board_promotion($1,'cs_test','pi_test',1000,'usd')", [row.id])
    await pay()
    const dates = (await db.query<{ paid_at: Date; review_due_at: Date }>("select paid_at,review_due_at from board_promotions")).rows[0]
    assert.equal(new Date(dates.review_due_at).getTime() - new Date(dates.paid_at).getTime(), 24 * 3600000)
    await pay()
    assert.deepEqual((await db.query("select paid_at,review_due_at from board_promotions")).rows[0], dates)
    assert.equal((await db.query("select * from board_promotion_notifications")).rows.length, 1)
    await db.exec("update board_promotions set review_due_at=now()-interval '1 minute';select sweep_board_promotion_operations();select sweep_board_promotion_operations();")
    assert.equal((await db.query("select * from board_promotion_notifications where kind='review_overdue'")).rows.length, 1)
    await db.query("select decide_board_promotion($1,$2,'reject','Policy violation')", [row.id, actor])
    await db.query("select decide_board_promotion($1,$2,'reject','Policy violation')", [row.id, actor])
    assert.equal((await db.query("select * from board_promotion_notifications where kind='rejected'")).rows.length, 1)
    for (let attempt = 1; attempt <= marketplacePolicy.promotions.maxRefundAttempts; attempt++) {
      const refund = (await db.query<{ refund_lease: string; refund_attempts: number }>("select * from claim_board_promotion_refund($1)", [row.id])).rows[0]
      assert.equal(refund.refund_attempts, attempt)
      assert.equal((await db.query("select * from claim_board_promotion_refund($1,true)", [row.id])).rows.length, 0)
      await db.query("select complete_board_promotion_refund_attempt($1,$2,null,'Provider unavailable')", [row.id, refund.refund_lease])
      await db.exec("update board_promotions set refund_next_attempt_at=now()-interval '1 minute'")
    }
    assert.equal((await db.query("select * from claim_board_promotion_refund($1)", [row.id])).rows.length, 0)
    assert.equal((await db.query("select * from board_promotion_notifications where kind='refund_failed'")).rows.length, 3)
    assert.equal((await db.query("select * from claim_board_promotion_refund($1,true)", [row.id])).rows.length, 1)
    // A provider still reporting pending at the last check must surface an alert.
    await db.exec("update board_promotions set refund_last_error=null")
    const pendingLease = (await db.query<{ refund_lease: string }>("select refund_lease from board_promotions")).rows[0].refund_lease
    await db.query("select complete_board_promotion_refund_attempt($1,$2,'re_pending',null)", [row.id, pendingLease])
    assert.match((await db.query<{ refund_last_error: string }>("select refund_last_error from board_promotions")).rows[0].refund_last_error, /checks exhausted/)
    // A worker which dies on its final claim is escalated when its lease expires.
    await db.exec("update board_promotions set refund_last_error=null,refund_lease_until=now()-interval '1 minute';select sweep_board_promotion_operations()")
    assert.match((await db.query<{ refund_last_error: string }>("select refund_last_error from board_promotions")).rows[0].refund_last_error, /checks exhausted/)
    await db.exec("select refund_board_promotion('pi_test','re_done');select refund_board_promotion('pi_test','re_done')")
    assert.equal((await db.query("select * from board_promotion_notifications where kind='refunded'")).rows.length, 1)
    assert.equal((await db.query<{ refund_last_error: string | null }>("select refund_last_error from board_promotions")).rows[0].refund_last_error, null)
    const jobs = (await db.query<{ id: string; lease: string }>("select * from claim_board_promotion_notifications(25)")).rows
    assert.ok(jobs.length > 0)
    assert.equal((await db.query("select * from claim_board_promotion_notifications(25)")).rows.length, 0)
    const job = jobs[0]
    await db.query("select complete_board_promotion_notification($1,$2,true)", [job.id, actor])
    assert.equal((await db.query<{ status: string }>("select status from board_promotion_notifications where id=$1", [job.id])).rows[0].status, "processing")
    await db.query("select complete_board_promotion_notification($1,$2,true)", [job.id, job.lease])
    assert.equal((await db.query<{ status: string }>("select status from board_promotion_notifications where id=$1", [job.id])).rows[0].status, "sent")
    await db.exec("update board_promotion_notifications set attempts=5,lease_until=now()-interval '1 minute' where status='processing';select sweep_board_promotion_operations()")
    assert.equal((await db.query("select * from claim_board_promotion_notifications(25)")).rows.length, 0)
    assert.ok((await db.query("select * from board_promotion_notifications where status='failed'")).rows.length > 0)
    await db.exec("set role authenticated")
    for (const sql of ["select * from board_promotion_notifications", "select claim_board_promotion_refund(null,true)", "select claim_board_promotion_notifications()", "select sweep_board_promotion_operations()", "select board_promotion_operations_ready()"])
      await assert.rejects(db.exec(sql), /permission denied/)
    await db.exec("reset role;set role service_role")
    assert.equal((await db.query<{ ready: boolean }>("select board_promotion_operations_ready() as ready")).rows[0].ready, true)
  } finally { await db.close() }
})

test("review deadlines and notification text never imply approval or a finished pending refund", () => {
  assert.equal(promotionReviewOverdue({ status: "pending", review_due_at: "2026-01-01" }, Date.parse("2026-01-02")), true)
  assert.equal(promotionReviewOverdue({ status: "active", review_due_at: "2026-01-01" }, Date.parse("2026-01-02")), false)
  assert.equal(promotionReviewOverdue({ status: "pending" }), false)
  const message = promotionNotificationMessage({ id: actor, promotion_id: actor, owner_id: owner, audience: "seller", kind: "rejected", lease: actor, payload: { listing_id: "ad-test", reason: "<script>untrusted</script>" } }, "https://example.test")
  assert.match(message.text, /We will notify you when Stripe confirms/)
  assert.match(message.text, /https:\/\/example.test\/my-ads\/featured/)
  assert.equal("html" in message, false)
})

test("operational reasons cannot inject markup into the email HTML fallback", () => {
  assert.equal(emailTextToHtml('<a href="https://attacker.test">Approve & pay</a>\nNext'), '&lt;a href=&quot;https://attacker.test&quot;&gt;Approve &amp; pay&lt;/a&gt;<br/>Next')
})
