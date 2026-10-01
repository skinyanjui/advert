import { readdirSync } from "node:fs"
import { spawnSync } from "node:child_process"

// Node options must precede the file list. This also avoids tsx CLI's IPC server.
const forwarded = process.argv.slice(2)
const files = readdirSync(new URL("./", import.meta.url))
  .filter((file) => file.endsWith(".test.ts"))
  .sort()
  .map((file) => `scripts/${file}`)
const result = spawnSync(process.execPath, ["--import", "tsx", "--test", ...forwarded, ...files], {
  stdio: "inherit",
})
if (result.error) console.error(result.error.message)
process.exit(result.status ?? 1)
