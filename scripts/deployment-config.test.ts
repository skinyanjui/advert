import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("production cron configuration can deploy on the existing Vercel Hobby plan", () => {
  const config = JSON.parse(readFileSync(new URL("../vercel.json", import.meta.url), "utf8")) as { crons: { path: string; schedule: string }[] }
  assert.ok(config.crons.some(job => job.path === "/api/cron/promotion-operations"))
  for (const job of config.crons) {
    const [minute, hour, day, month, weekday] = job.schedule.split(" ")
    assert.match(minute, /^\d+$/, "Hobby cron minutes cannot repeat within an hour")
    assert.match(hour, /^\d+$/, "Hobby cron hours cannot repeat within a day")
    assert.ok(Number(minute) <= 59 && Number(hour) <= 23)
    assert.deepEqual([day, month, weekday], ["*", "*", "*"])
  }
})
