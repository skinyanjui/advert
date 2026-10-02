import assert from "node:assert/strict"
import { execFile } from "node:child_process"
import { promisify } from "node:util"
import test from "node:test"
import { createClient } from "@supabase/supabase-js"
import {
  ownerInventoryLimit,
  publicBoardPageSize,
  readOwnedInventory,
  readPublicBoardPage,
  readSavedListingIds,
  readSellerProfileRows,
  savedListingLimit,
  type BoardListingRow,
} from "../src/lib/board-inventory"
import { readKeysetPages } from "../src/lib/keyset-pages"

const owner = "00000000-0000-4000-8000-000000000001"
const other = "00000000-0000-4000-8000-000000000002"

function client(fetcher: (url: URL) => Response | Promise<Response>) {
  return createClient("https://inventory.test", "test-key", {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: async input => fetcher(new URL(String(input))) },
  })
}

test("private board inventory is owner-only and bounded", async () => {
  let seen = false
  const db = client(url => {
    seen = true
    assert.equal(url.pathname, "/rest/v1/board_listings")
    assert.equal(url.searchParams.get("owner_id"), `eq.${owner}`)
    assert.equal(url.searchParams.get("limit"), String(ownerInventoryLimit))
    assert.equal(url.searchParams.has("offset"), false)
    assert.match(url.searchParams.get("order") ?? "", /posted_at\.desc/)
    return Response.json([{ id: "ad-own", owner_id: owner, posted_at: "2026-10-01T00:00:00Z", payload: {} }])
  })
  const rows = await readOwnedInventory(db, owner)
  assert.equal(seen, true)
  assert.equal(rows.length, 1)
  assert.equal(rows[0]?.owner_id, owner)
})

test("public board query is filtered, bounded, cursor paginated, and server searched", async () => {
  const rows: BoardListingRow[] = Array.from({ length: publicBoardPageSize + 1 }, (_, index) => ({
    id: `ad-${String(9999-index).padStart(5,"0")}`,
    owner_id: other,
    posted_at: new Date(Date.UTC(2026, 9, 2, 12, 0, -index)).toISOString(),
    payload: { title: "Toyota", category: "vehicles", city: "Nairobi" },
    status: "active",
    hidden_at: null,
    expires_at: null,
  }))
  let calls = 0
  const db = client(url => {
    calls++
    assert.equal(url.pathname, "/rest/v1/board_listings")
    assert.equal(url.searchParams.get("limit"), String(publicBoardPageSize + 1))
    assert.equal(url.searchParams.has("offset"), false)
    assert.equal(url.searchParams.get("status"), "eq.active")
    assert.equal(url.searchParams.get("hidden_at"), "is.null")
    assert.equal(url.searchParams.get("country_code"), "eq.KE")
    assert.equal(url.searchParams.get("payload->>category"), "eq.vehicles")
    assert.ok(url.searchParams.get("search_document"))
    return Response.json(rows)
  })
  const page = await readPublicBoardPage(db, { country: "KE", category: "vehicles", q: "toyota" })
  assert.equal(calls, 1)
  assert.equal(page.rows.length, publicBoardPageSize)
  assert.ok(page.nextCursor)

  const cursorDb = client(url => {
    assert.match(url.searchParams.get("or") ?? "", /posted_at\.lt\./)
    return Response.json([])
  })
  const second = await readPublicBoardPage(cursorDb, { cursor: page.nextCursor! })
  assert.deepEqual(second, { rows: [], nextCursor: null })
})

test("invalid public cursor fails before returning a partial page", async () => {
  const db = client(() => {
    throw new Error("fetch should not be reached")
  })
  await assert.rejects(readPublicBoardPage(db, { cursor: "not-a-cursor" }), /Invalid public listings cursor/)
})

test("saved state is owner-only and bounded", async () => {
  const db = client(url => {
    assert.equal(url.searchParams.get("owner_id"), `eq.${owner}`)
    assert.equal(url.searchParams.get("limit"), String(savedListingLimit))
    return Response.json([{ listing_id: "ad-1", created_at: "2026-10-02T00:00:00Z" }])
  })
  assert.deepEqual(await readSavedListingIds(db, owner), ["ad-1"])
})

test("seller profile reads remain complete across safe IN-list chunks", async () => {
  const ids = Array.from({ length: 201 }, (_, index) => `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`)
  const db = client(url => {
    const selected = url.searchParams.get("user_id")!
    const filters = url.searchParams.getAll("user_id")
    const allowed = selected.slice(4, -1).split(",")
    assert.ok(allowed.length <= 100)
    const after = filters.find(value => value.startsWith("gt."))?.slice(3)
    return Response.json(ids.filter(id => allowed.includes(id) && (!after || id > after)).slice(0, 73)
      .map(id => ({ user_id: id, display_name: id, avatar_url: null, created_at: null })))
  })
  const profiles = await readSellerProfileRows(db, [...ids, ids[0]!])
  assert.equal(profiles.length, ids.length)
})

test("failed or repeating keyset pages never return a partial success", async () => {
  let pages = 0
  await assert.rejects(readKeysetPages(async () => {
    if (pages++ === 1) throw new Error("Database unavailable")
    return [{ id: "ad-1" }]
  }, row => row.id), /Database unavailable/)
  await assert.rejects(readKeysetPages(async () => [{ id: "ad-1" }], row => row.id), /did not advance/)
})

test("direct listing lookup stays independent and never exposes private phone data", async () => {
  const source = `
    import assert from "node:assert/strict";
    import { seedListings } from "./src/lib/catalog.ts";
    import { getPublicListing } from "./src/lib/board-store.ts";
    let changes = {};
    globalThis.fetch = async input => {
      const url = new URL(String(input));
      if (url.pathname.endsWith("/board_profiles")) return Response.json([]);
      return Response.json({
        id: "ad-direct", owner_id: "00000000-0000-4000-8000-000000000002", posted_at: new Date().toISOString(),
        status: "active", hidden_at: null, expires_at: new Date(Date.now()+86400000).toISOString(),
        payload: { ...seedListings[0], id: "ad-direct", phone: "+254700000000", contactPhone: true, contactWhatsApp: true },
        ...changes,
      });
    };
    const listing = await getPublicListing("ad-direct");
    assert.ok(listing);
    assert.equal(listing.phone, "");
    assert.equal(listing.contactPhone, false);
    assert.equal(listing.contactWhatsApp, false);
    for (changes of [{status:"paused"},{status:"sold"},{status:"expired"},{hidden_at:new Date().toISOString()},{expires_at:"2020-01-01T00:00:00Z"}]) {
      assert.equal(await getPublicListing("ad-direct"), undefined);
    }
  `
  await promisify(execFile)(process.execPath, ["--conditions=react-server", "--import", "tsx", "--input-type=module", "--eval", source], {
    cwd: new URL("../", import.meta.url),
    env: { ...process.env, SUPABASE_URL: "https://inventory.test", SUPABASE_SECRET_KEY: "test-key" },
    timeout: 15_000,
  })
})
