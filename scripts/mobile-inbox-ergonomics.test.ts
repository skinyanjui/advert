import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

function source(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8")
}

test("mobile Messenger uses full-bleed content and iOS-safe controls", () => {
  const page = source("src/components/messages-page.tsx")
  const list = source("src/components/inbox/conversation-list.tsx")
  const reply = source("src/components/inbox/reply-form.tsx")

  assert.match(page, /-mx-3 grid[\s\S]*border-y[\s\S]*md:mx-0[\s\S]*md:rounded-xl md:border/)
  assert.match(list, /h-11[\s\S]*text-base[\s\S]*sm:h-9 sm:text-sm/)
  assert.match(list, /min-h-11[\s\S]*sm:min-h-0/)
  assert.match(reply, /text-base sm:text-sm/)
  assert.match(reply, /h-11 rounded-full[\s\S]*sm:h-8/)
})

test("mobile Messenger filter controls preserve keyboard focus visibility", () => {
  const list = source("src/components/inbox/conversation-list.tsx")
  assert.match(list, /focus-visible:outline-2/)
})
