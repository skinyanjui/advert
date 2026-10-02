import assert from "node:assert/strict"
import { createHmac } from "node:crypto"
import { readFileSync } from "node:fs"
import test from "node:test"
import { PGlite } from "@electric-sql/pglite"
import { sortListings, matchesQuery } from "../src/lib/board"
import { seedListings } from "../src/lib/catalog"
import { acceptListing, allowedCurrencies } from "../src/lib/listing-rules"
import { featuredPackage, isFeatured, canCreatePromotionCheckout } from "../src/lib/promotions"
import { verifyStripeSignature } from "../src/lib/stripe-signature"

const owner = "00000000-0000-4000-8000-000000000001"
const buyer = "00000000-0000-4000-8000-000000000002"
const admin = "00000000-0000-4000-8000-000000000003"
const now = Date.now()
const future = new Date(now + 86400000).toISOString()

test("only active time-bounded promotions get priority; explicit sorts retain their order", () => {
  const ordinary = { ...seedListings[0], id: "ordinary", title: "Toyota", price: 1, hoursAgo: 1 }
  const promoted = { ...ordinary, id: "promoted", price: 20, hoursAgo: 10, featured: true, featuredUntil: future }
  assert.equal(isFeatured({ ...promoted, featuredUntil: new Date(now).toISOString() }, now), false)
  for (const change of [{ sold: true }, { hidden: true }, { status: "paused" as const }, { expiresAt: new Date(now).toISOString() }, { featuredUntil: "invalid" }, { featuredUntil: undefined }]) {
    assert.equal(isFeatured({ ...promoted, ...change }, now), false)
  }
  assert.deepEqual(sortListings([ordinary, promoted], "relevant", "USD", "Toyota").map(x => x.id), ["promoted", "ordinary"])
  assert.deepEqual(sortListings([promoted, ordinary], "price-asc", "USD").map(x => x.id), ["ordinary", "promoted"])
  assert.deepEqual(sortListings([promoted, ordinary], "newest", "USD").map(x => x.id), ["ordinary", "promoted"])
  assert.equal(matchesQuery({ ...promoted, title: "Desk", description: "Office furniture", details: {}, subcategory: undefined }, "Toyota"), false)
  assert.equal(seedListings.some(x => x.featured || x.badge === "featured"), false)
  assert.equal(featuredPackage.amount, 1000)
  assert.equal(featuredPackage.currency, "usd")
  assert.equal(featuredPackage.days, 7)
})

test("Stripe signatures require the exact body, a valid signature, and a fresh timestamp", () => {
  const body = '{"type":"checkout.session.completed"}'
  const secret = "test-secret"
  const time = Math.floor(now / 1000)
  const sig = createHmac("sha256", secret).update(`${time}.${body}`).digest("hex")
  assert.equal(verifyStripeSignature(body, `t=${time},v1=${sig}`, secret, now), true)
  assert.equal(verifyStripeSignature(body, `t=${time},v1=invalid,v1=${sig}`, secret, now), true)
  assert.equal(verifyStripeSignature(body + " ", `t=${time},v1=${sig}`, secret, now), false)
  assert.equal(verifyStripeSignature(body, `t=${time},v1=${sig}`, secret, now + 301000), false)
  assert.equal(verifyStripeSignature(body, `t=${time},v1=${sig}`, "wrong", now), false)
  assert.equal(verifyStripeSignature(body, `t=nope,v1=${sig}`, secret, now), false)
})

test("sellers cannot set paid promotion fields through listing submission", () => {
  const result = acceptListing({ ...seedListings[0], id: "ad-forged", currency: allowedCurrencies(seedListings[0].country)[0], locationDetail: "Collection in city centre", contactPhone: false, contactWhatsApp: false, mine: true, featured: true, featuredUntil: future, featuredPaid: true, featuredPromotionId: owner })
  assert.equal(result.ok, true)
  if (result.ok) {
    assert.equal(result.listing.featured, undefined)
    assert.equal(result.listing.featuredUntil, undefined)
    assert.equal(result.listing.featuredPaid, undefined)
    assert.equal(result.listing.featuredPromotionId, undefined)
  }
})

test("real PostgreSQL promotion lifecycle, retry safety, access controls and statistics", async () => {
  const db = new PGlite()
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create table public.board_listings (
        id text primary key, owner_id uuid not null, status text not null default 'active',
        expires_at timestamptz default now() + interval '60 days', hidden_at timestamptz
      );
      grant all on public.board_listings to service_role;
      insert into board_listings(id, owner_id) values ('ad-test','${owner}'),('ad-refund','${owner}'),('ad-grant','${owner}'),('ad-delete','${owner}'),('ad-out-of-order','${owner}'),('ad-unbound','${owner}'),('ad-unbound-expired','${owner}');
    `)
    await db.exec(readFileSync(new URL("../database/migrations/20261002_featured_promotions.sql", import.meta.url), "utf8"))
    // Reapplying setup is safe; no payment or state is reset.
    await db.exec(readFileSync(new URL("../database/migrations/20261002_featured_promotions.sql", import.meta.url), "utf8"))
    async function request(listing: string) {
      const result = await db.query<{ id: string; status: string }>("select * from request_board_promotion($1,$2)", [listing, owner])
      return result.rows[0]
    }
    async function decide(id: string, action: string) { return db.query("select * from decide_board_promotion($1,$2,$3,'Reviewed listing')", [id, admin, action]) }
    async function pay(id: string, session: string, intent: string) {
      await db.query("select bind_board_promotion_checkout($1,$2)", [id, session])
      await db.query("select pay_board_promotion($1,$2,$3,1000,'usd')", [id, session, intent])
    }
    await assert.rejects(db.query("select * from request_board_promotion('ad-test',$1)", [buyer]), /not owned/)
    const r = await request("ad-test")
    assert.equal(r.status, "awaiting_payment")
    assert.equal((await request("ad-test")).id, r.id)
    await assert.rejects(decide(r.id, "approve"), /Payment must be confirmed/)
    await db.query("select bind_board_promotion_checkout($1,'cs_one')", [r.id])
    await assert.rejects(db.query("select pay_board_promotion($1,'cs_wrong','pi_one',1000,'usd')", [r.id]), /does not match/)
    await assert.rejects(db.query("select pay_board_promotion($1,'cs_one','pi_one',1,'usd')", [r.id]), /does not match/)
    await assert.rejects(db.query("select pay_board_promotion($1,'cs_one','pi_one',1000,'eur')", [r.id]), /does not match/)
    await pay(r.id, "cs_one", "pi_one")
    await db.query("select pay_board_promotion($1,'cs_one','pi_one',1000,'usd')", [r.id])
    assert.equal((await db.query<{ featured: boolean }>("select featured from board_listings where id='ad-test'")).rows[0].featured, false)
    await decide(r.id, "approve")
    const active = (await db.query<{ starts_at: Date; ends_at: Date }>("select starts_at,ends_at from board_promotions where id=$1", [r.id])).rows[0]
    assert.equal(new Date(active.ends_at).getTime() - new Date(active.starts_at).getTime(), 7 * 86400000)
    await decide(r.id, "approve")
    assert.deepEqual((await db.query("select starts_at,ends_at from board_promotions where id=$1", [r.id])).rows[0], active)
    await assert.rejects(request("ad-test"), /already featured/)
    await db.query("select pay_board_promotion($1,'cs_one','pi_one',1000,'usd')", [r.id])
    assert.equal((await db.query<{ status: string }>("select status from board_promotions where id=$1", [r.id])).rows[0].status, "active")
    for (const actor of [owner, buyer, buyer]) {
      await db.query("select record_board_promotion_event($1,'impression',$2,$3)", [r.id, actor, actor])
    }
    await db.query("select record_board_promotion_event($1,'click',$2,$3)", [r.id, buyer, buyer])
    const counts = (await db.query<{ impressions: number; clicks: number }>("select * from board_promotion_stats(array[$1::uuid])", [r.id])).rows[0]
    assert.equal(Number(counts.impressions), 1)
    assert.equal(Number(counts.clicks), 1)
    await db.exec("update board_listings set status='paused' where id='ad-test'")
    await db.query("select record_board_promotion_event($1,'impression',$2,'another')", [r.id, buyer])
    assert.equal(Number((await db.query<{ count: number }>("select count(*) from board_promotion_events")).rows[0].count), 2)
    await db.exec("update board_listings set status='active' where id='ad-test'")
    const refund = await request("ad-refund")
    await pay(refund.id, "cs_refund", "pi_refund")
    await decide(refund.id, "reject")
    await decide(refund.id, "reject")
    await assert.rejects(decide(refund.id, "approve"), /Payment must be confirmed/)
    await db.query("select refund_board_promotion('pi_refund','re_one')")
    await db.query("select refund_board_promotion('pi_refund','re_one')")
    assert.equal((await db.query<{ status: string }>("select status from board_promotions where id=$1", [refund.id])).rows[0].status, "refunded")
    await decide(r.id, "remove")
    await decide(r.id, "remove")
    const trail = await db.query<{ action: string; reason: string }>("select action,reason from board_promotion_decisions where promotion_id=$1 order by created_at", [r.id])
    assert.deepEqual(trail.rows.map(row => row.action), ["approve", "remove"])
    assert.ok(trail.rows.every(row => row.reason === "Reviewed listing"))
    assert.equal((await db.query<{ featured: boolean }>("select featured from board_listings where id='ad-test'")).rows[0].featured, false)
    await db.query("select refund_board_promotion('pi_one','re_two')")
    const grant = (await db.query<{ id: string }>("select * from grant_board_promotion('ad-grant',$1,3,'Complimentary placement')", [admin])).rows[0]
    assert.equal((await db.query<{ featured_paid: boolean }>("select featured_paid from board_listings where id='ad-grant'")).rows[0].featured_paid, false)
    await db.query("update board_promotions set starts_at=now()-interval '4 days',ends_at=now()-interval '1 day' where id=$1", [grant.id])
    await db.exec("update board_listings set featured_until=now()-interval '1 day' where id='ad-grant'")
    await db.exec("select expire_board_promotions()")
    assert.equal((await db.query<{ featured: boolean }>("select featured from board_listings where id='ad-grant'")).rows[0].featured, false)
    assert.equal((await db.query<{ status: string }>("select status from board_promotions where id=$1", [grant.id])).rows[0].status, "expired")
    // Paid history survives listing deletion; the admin can still reject/refund.
    const deleted = await request("ad-delete")
    await pay(deleted.id, "cs_deleted", "pi_deleted")
    await db.exec("delete from board_listings where id='ad-delete'")
    await assert.rejects(decide(deleted.id, "approve"), /Listing must be active/)
    await decide(deleted.id, "reject")
    // A refund observed before a delayed checkout webhook must never grant ranking.
    const delayed = await request("ad-out-of-order")
    await db.query("select bind_board_promotion_checkout($1,'cs_delayed')", [delayed.id])
    await db.query("select pay_board_promotion($1,'cs_delayed','pi_delayed',1000,'usd',true)", [delayed.id])
    await db.query("select pay_board_promotion($1,'cs_delayed','pi_delayed',1000,'usd',false)", [delayed.id])
    assert.equal((await db.query<{ status: string }>("select status from board_promotions where id=$1", [delayed.id])).rows[0].status, "refunded")
    await assert.rejects(decide(delayed.id, "approve"), /Payment must be confirmed/)
    // A signed payment can recover an unknown checkout-create/bind outcome.
    const unbound = await request("ad-unbound")
    await db.query("select pay_board_promotion($1,'cs_unbound','pi_unbound',1000,'usd')", [unbound.id])
    assert.equal((await db.query<{ status: string }>("select status from board_promotions where id=$1", [unbound.id])).rows[0].status, "pending")
    await db.query("select cancel_board_promotion_checkout($1,'cs_unbound')", [unbound.id])
    assert.equal((await db.query<{ status: string }>("select status from board_promotions where id=$1", [unbound.id])).rows[0].status, "pending")
    const abandoned = await request("ad-unbound-expired")
    await db.query("select cancel_board_promotion_checkout($1,'cs_expired')", [abandoned.id])
    assert.notEqual((await request("ad-unbound-expired")).id, abandoned.id)
    await db.exec("set role service_role")
    assert.equal((await db.query<{ status: string }>("select * from request_board_promotion('ad-grant',$1)", [owner])).rows[0].status, "awaiting_payment")
    await db.exec("reset role; set role authenticated")
    await assert.rejects(db.exec("select * from board_promotions"), /permission denied/)
    await assert.rejects(db.exec("select * from grant_board_promotion('ad-test',null,7,'Forged')"), /permission denied/)
    await assert.rejects(db.exec("select * from board_promotion_stats(array[]::uuid[])"), /permission denied/)
  } finally { await db.close() }
})


test("unknown checkout creation outcomes cannot be retried after Stripe's idempotency window", () => {
  assert.equal(canCreatePromotionCheckout(new Date(now - 22 * 3600000).toISOString(), now), true)
  assert.equal(canCreatePromotionCheckout(new Date(now - 23 * 3600000).toISOString(), now), false)
  assert.equal(canCreatePromotionCheckout("invalid", now), false)
  assert.equal(canCreatePromotionCheckout(new Date(now + 1000).toISOString(), now), false)
})
