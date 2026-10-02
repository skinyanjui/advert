import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { PGlite } from "@electric-sql/pglite"

import { contactLeadOptions, contactLeadsResponse } from "../src/lib/contact-leads"
import type { BoardOwner } from "../src/lib/board-session"
import { contactEventTypes } from "../src/lib/contact-event-types"
import { sellerLeadsCopy } from "../src/lib/i18n/seller-leads"
import { locales } from "../src/lib/i18n/locales"
import { marketplacePolicy } from "../src/lib/marketplace-policy"

const owner = "00000000-0000-4000-8000-000000000001"
const buyer = "00000000-0000-4000-8000-000000000002"
const other = "00000000-0000-4000-8000-000000000003"
const migration = readFileSync(new URL("../database/migrations/20261002_seller_contact_leads.sql", import.meta.url), "utf8")

test("seller lead handler requires authenticated membership and current terms before querying only the resolved owner", async () => {
  let resolved: BoardOwner | undefined
  let blocked: Response | null = null
  let calls = 0
  const dependencies = {
    resolveOwner: async () => resolved,
    requireCurrentTerms: async (id: string) => { assert.equal(id, owner); return blocked },
    list: async (id: string) => { assert.equal(id, owner); calls++; return { rows: [], hasMore: false } },
  }
  const request = new Request(`https://example.test/api/contact-leads?ownerId=${buyer}`)
  assert.equal((await contactLeadsResponse(request, dependencies)).status, 401)
  resolved = { id: owner, kind: "session" }
  assert.equal((await contactLeadsResponse(request, dependencies)).status, 401)
  assert.equal(calls, 0)
  resolved = { id: owner, kind: "auth", role: "member" }
  blocked = Response.json({ ok: false }, { status: 428 })
  assert.equal((await contactLeadsResponse(request, dependencies)).status, 428)
  blocked = Response.json({ ok: false }, { status: 503 })
  assert.equal((await contactLeadsResponse(request, dependencies)).status, 503)
  assert.equal(calls, 0)
  blocked = null
  const response = await contactLeadsResponse(request, dependencies)
  assert.equal(response.status, 200)
  assert.equal(response.headers.get("cache-control"), "private, no-store")
  assert.equal(calls, 1)
  assert.equal((await contactLeadsResponse(new Request("https://example.test/api/contact-leads?page=-1"), dependencies)).status, 400)
  assert.equal(calls, 1)
  assert.equal(contactLeadOptions(new Request("https://example.test?listingId=sample")), null)
  assert.equal(contactLeadOptions(new Request("https://example.test?" + new URLSearchParams(Array.from({ length: 51 }, (_, i) => ["listingId", `ad-${i}`])))), null)
  assert.deepEqual(contactLeadOptions(new Request("https://example.test?listingId=ad-test&listingId=ad-test")), { page: 0, listingIds: ["ad-test"] })
})

test("PostgreSQL contact reporting deduplicates, isolates owners, excludes self/old events, pages and cleans up", async () => {
  const db = new PGlite()
  try {
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create table board_listings(id text primary key, owner_id uuid not null, payload jsonb not null, status text not null default 'active', posted_at timestamptz not null default now(), expires_at timestamptz default now() + interval '60 days', hidden_at timestamptz);
      grant all on board_listings to service_role;
      insert into board_listings(id,owner_id,payload) values
      ('ad-test','${owner}','{"title":"Test","contactPhone":true,"contactWhatsApp":true}'),
      ('ad-other','${other}','{"title":"Other"}'),
      ('ad-disabled','${owner}','{"title":"Disabled"}');
    `)
    for (const name of ["20260929_contact_events.sql", "20260929_contact_sms.sql"]) await db.exec(readFileSync(new URL(`../database/migrations/${name}`, import.meta.url), "utf8"))
    await db.exec(`insert into board_contact_events(id,listing_id,actor_id,actor_kind,event_type) values (gen_random_uuid(),'ad-test','${buyer}','auth','phone_click'),(gen_random_uuid(),'ad-test','${buyer}','auth','phone_click');`)
    await db.exec(migration)
    await db.exec(migration)
    assert.equal((await db.query<{ n: number }>("select count(*)::int n from board_contact_events")).rows[0].n, 1)
    for (const role of ["anon", "authenticated"]) {
      await db.exec(`set role ${role}`)
      await assert.rejects(db.query("select * from seller_contact_leads($1)", [owner]), /permission denied/)
      await assert.rejects(db.query("select * from board_contact_events"), /permission denied/)
      await assert.rejects(db.query("select record_board_contact_event('ad-test',$1,'auth','phone_click')", [buyer]), /permission denied/)
      await db.exec("reset role")
    }
    await db.exec("set role service_role")
    async function record(id: string, actor: string, kind: string, event: string) { return db.query("select record_board_contact_event($1,$2,$3,$4)", [id, actor, kind, event]) }
    for (const event of contactEventTypes) {
      await record("ad-test", buyer, "auth", event)
      await record("ad-test", buyer, "auth", event)
      await record("ad-test", owner, "auth", event)
      await record("ad-test", other, "session", event)
    }
    for (const event of ["phone_click", "sms_click", "whatsapp_click"]) await record("ad-disabled", buyer, "auth", event)
    await record("missing", buyer, "auth", "listing_view")
    await db.exec("update board_listings set status = 'paused' where id = 'ad-test'")
    await record("ad-test", other, "auth", "message_start")
    await db.exec("update board_listings set status = 'active' where id = 'ad-test'")
    await db.exec(`insert into board_contact_events(id,listing_id,actor_id,actor_kind,event_type,created_at) values
      (gen_random_uuid(),'ad-test','${buyer}','auth','phone_click',now()-interval '1 day'),
      (gen_random_uuid(),'ad-test','${other}','auth','phone_click',now()-interval '91 days'),
      (gen_random_uuid(),'ad-test','${owner}','auth','phone_click',now());`)
    const stats = await db.query<Record<string, string>>("select * from seller_contact_leads($1, array['ad-test','ad-other'])", [owner])
    assert.equal(stats.rows.length, 1)
    assert.equal(stats.rows[0].listing_id, "ad-test")
    assert.equal(Number(stats.rows[0].views), 2)
    for (const metric of ["contacts", "whatsapp", "calls", "texts", "messages"]) assert.equal(Number(stats.rows[0][metric]), 1, metric)
    assert.equal(Object.keys(stats.rows[0]).some(key => key.includes("actor") || key.includes("buyer")), false)
    assert.equal(Number((await db.query<Record<string, string>>("select * from seller_contact_leads($1,array['ad-disabled'])", [owner])).rows[0].contacts), 0)
    // Aggregate in PostgreSQL so even more than the REST row limit is counted.
    await db.exec(`insert into board_contact_events(id,listing_id,actor_id,actor_kind,event_type) select gen_random_uuid(),'ad-test',gen_random_uuid(),'auth','message_start' from generate_series(1,1200);`)
    assert.equal(Number((await db.query<Record<string, string>>("select * from seller_contact_leads($1,array['ad-test'])", [owner])).rows[0].contacts), 1201)
    await db.exec(`insert into board_listings(id,owner_id,payload,posted_at) select 'ad-page-'||n,'${owner}','{"title":"Page"}',now()-interval '1 day' from generate_series(1,55) n;`)
    assert.equal((await db.query("select * from seller_contact_leads($1,null,0,51)", [owner])).rows.length, 51)
    assert.equal((await db.query("select * from seller_contact_leads($1,null,50,51)", [owner])).rows.length, 7)
    assert.equal(Number((await db.query<{ expire_board_contact_events: string }>("select expire_board_contact_events()")).rows[0].expire_board_contact_events), 1)
    await db.exec("delete from board_listings where id = 'ad-test'")
    assert.equal((await db.query<{ n: number }>("select count(*)::int n from board_contact_events")).rows[0].n, 0)
  } finally { await db.close() }
})

test("contact analytics disclosure, translations, retention and privacy rights share their authority", () => {
  assert.ok(migration.includes(`interval '${marketplacePolicy.contactAnalytics.retentionDays} days'`))
  assert.ok(migration.includes(`least(p_limit, ${marketplacePolicy.contactAnalytics.pageSize + 1})`))
  for (const event of contactEventTypes) assert.ok(migration.includes(`'${event}'`))
  for (const locale of locales) assert.deepEqual(Object.keys(sellerLeadsCopy[locale]), Object.keys(sellerLeadsCopy.en))
  for (const filename of ["privacy-export.ts", "profile-store.ts"]) assert.ok(readFileSync(new URL(`../src/lib/${filename}`, import.meta.url), "utf8").includes('.from("board_contact_events")'))
})
