import assert from "node:assert/strict"
import { execFile } from "node:child_process"
import { promisify } from "node:util"
import test from "node:test"
import { createClient } from "@supabase/supabase-js"
import { readBoardInventory, readSavedListingIds, readSellerProfileRows, type BoardListingRow } from "../src/lib/board-inventory"
import { readKeysetPages } from "../src/lib/keyset-pages"

const owner = "00000000-0000-4000-8000-000000000001"
const other = "00000000-0000-4000-8000-000000000002"

function client(fetcher: (url: URL) => Response | Promise<Response>) {
  return createClient("https://inventory.test", "test-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async input => fetcher(new URL(String(input))) },
  })
}

test("inventory includes old owned and matching public ads beyond 500, even under a smaller service page cap", async () => {
  const rows: BoardListingRow[] = Array.from({ length: 1_207 }, (_, index) => ({
    id: `ad-${String(index).padStart(5, "0")}`,
    owner_id: other,
    posted_at: "2026-01-01T00:00:00.000Z", // Ties cannot skip a page.
    payload: { title: index === 1_200 ? "Old searchable stock" : "Listing" },
    status: "active", hidden_at: null, expires_at: null,
  }))
  rows[1_201] = { ...rows[1_201]!, owner_id: owner, status: "paused" }
  rows[1_202] = { ...rows[1_202]!, owner_id: owner, status: "sold", hidden_at: "2026-01-02" }
  rows[1_203] = { ...rows[1_203]!, status: "paused" }
  rows[1_204] = { ...rows[1_204]!, hidden_at: "2026-01-02" }
  rows[1_205] = { ...rows[1_205]!, expires_at: "2020-01-01T00:00:00Z" }
  rows[1_206] = { ...rows[1_206]!, status: "sold" }
  let calls = 0
  const db = client(url => {
    calls++
    assert.equal(url.pathname, "/rest/v1/board_listings")
    assert.equal(url.searchParams.get("order"), "id.asc")
    assert.equal(url.searchParams.has("offset"), false)
    const filter = url.searchParams.get("or")!
    assert.match(filter, new RegExp(`^\\(owner_id.eq.${owner},and\\(hidden_at.is.null,or\\(status.is.null,status.eq.active\\),or\\(expires_at.is.null,expires_at.gt.`))
    const after = url.searchParams.get("id")?.slice(3)
    const visible = rows.filter(row => row.owner_id === owner || (
      !row.hidden_at && row.status === "active" && (!row.expires_at || Date.parse(row.expires_at) > Date.now())
    ))
    return Response.json(visible.filter(row => !after || row.id > after).slice(0, 73))
  })
  const actual = await readBoardInventory(db, owner)
  assert.equal(actual.length, 1_203)
  assert.equal(new Set(actual.map(row => row.id)).size, 1_203)
  assert.deepEqual(actual.find(row => row.id === "ad-01200")?.payload, { title: "Old searchable stock" })
  assert.ok(actual.some(row => row.id === "ad-01201" && row.status === "paused"))
  assert.ok(actual.some(row => row.id === "ad-01202" && row.hidden_at))
  assert.ok(!actual.some(row => ["ad-01203", "ad-01204", "ad-01205", "ad-01206"].includes(row.id)))
  assert.ok(calls > 16)
})

test("saved ads beyond the service limit remain available only for their owner", async () => {
  const rows = Array.from({ length: 601 }, (_, index) => ({
    listing_id: `ad-${String(index).padStart(5, "0")}`,
    created_at: new Date(Date.UTC(2025, 0, 1) + index * 1000).toISOString(),
  }))
  const db = client(url => {
    assert.equal(url.searchParams.get("owner_id"), `eq.${owner}`)
    assert.equal(url.searchParams.get("order"), "listing_id.asc")
    const after = url.searchParams.get("listing_id")?.slice(3)
    return Response.json(rows.filter(row => !after || row.listing_id > after).slice(0, 49))
  })
  const saved = await readSavedListingIds(db, owner)
  assert.equal(saved.length, 601)
  assert.equal(saved[0], "ad-00600")
  assert.equal(saved.at(-1), "ad-00000")
})

test("seller profiles are complete beyond both IN-list chunks and smaller server limits", async () => {
  const ids = Array.from({ length: 601 }, (_, index) => `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`)
  const db = client(url => {
    const selected = url.searchParams.get("user_id")!
    // Supabase combines IN and keyset filters with repeated column parameters.
    const filters = url.searchParams.getAll("user_id")
    assert.match(selected, /^in\.\(/)
    const allowed = selected.slice(4, -1).split(",")
    assert.ok(allowed.length <= 100)
    const after = filters.find(value => value.startsWith("gt."))?.slice(3)
    return Response.json(ids.filter(id => allowed.includes(id) && (!after || id > after)).slice(0, 31)
      .map(id => ({ user_id: id, display_name: id, avatar_url: null, created_at: null })))
  })
  const profiles = await readSellerProfileRows(db, [...ids, ids[0]!])
  assert.equal(profiles.length, ids.length)
  assert.deepEqual(profiles.map(row => row.user_id), ids)
})

test("failed or repeating inventory pages never return a partial success", async () => {
  let pages = 0
  await assert.rejects(readKeysetPages(async () => {
    if (pages++ === 1) throw new Error("Database unavailable")
    return [{ id: "ad-1" }]
  }, row => row.id), /Database unavailable/)
  await assert.rejects(readKeysetPages(async () => [{ id: "ad-1" }], row => row.id), /did not advance/)
})

test("direct listing lookup is independent of browse and never exposes private listings or phone numbers", async () => {
  // The actual store imports server-only modules. Isolate that runtime condition
  // so the normal client-compatible test suite can still import React helpers.
  const source = `
    import assert from "node:assert/strict";
    import { seedListings } from "./src/lib/catalog.ts";
    import { getPublicListing } from "./src/lib/board-store.ts";
    let changes = {};
    let lookups = 0;
    globalThis.fetch = async input => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/board_profiles")) return Response.json([]);
      assert.equal(url.pathname, "/rest/v1/board_listings");
      assert.equal(url.searchParams.get("id"), "eq.ad-direct");
      lookups++;
      return Response.json({
        id: "ad-direct", owner_id: "${other}", posted_at: new Date().toISOString(),
        status: "active", hidden_at: null, expires_at: new Date(Date.now()+86400000).toISOString(),
        payload: { ...seedListings[0], id: "ad-direct", contactPhone: true, contactWhatsApp: true },
        ...changes,
      });
    };
    const listing = await getPublicListing("ad-direct");
    assert.ok(listing);
    assert.equal(listing.phone, "");
    assert.equal(listing.contactPhone, false);
    assert.equal(listing.contactWhatsApp, false);
    assert.equal(listing.mine, false);
    assert.equal("owner_id" in listing, false);
    for (changes of [{status:"paused"},{status:"sold"},{status:"expired"},{hidden_at:new Date().toISOString()},{expires_at:"2020-01-01T00:00:00Z"}]) {
      assert.equal(await getPublicListing("ad-direct"), undefined);
    }
    const before = lookups;
    assert.equal(await getPublicListing("land-cruiser-79"), undefined);
    assert.equal(await getPublicListing("ad-bad/id"), undefined);
    assert.equal(lookups, before);
  `
  await promisify(execFile)(process.execPath, ["--conditions=react-server", "--import", "tsx", "--input-type=module", "--eval", source], {
    cwd: new URL("../", import.meta.url),
    env: { ...process.env, SUPABASE_URL: "https://inventory.test", SUPABASE_SECRET_KEY: "test-key" },
    timeout: 15_000,
  })
})
