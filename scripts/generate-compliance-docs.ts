import { writeFileSync } from "node:fs"

import { complianceFacts, complianceItems } from "../src/lib/compliance"

const lines = [
  "# Compliance controls",
  "",
  "> Generated from `src/lib/compliance.ts` and `src/lib/product-capabilities.ts`. Do not edit the control list by hand.",
  "",
  "## Current product facts",
  "",
  ...Object.entries(complianceFacts).map(([key, value]) => `- **${key}:** ${String(value)}`),
  "",
  "## Law-to-product registry",
  "",
]

for (const item of complianceItems()) {
  lines.push(`### ${item.law}`, "", `**State:** ${item.state}`, "", item.scope, "")
  if (item.triggers.length) {
    lines.push("**Triggers**", "", ...item.triggers.map((value) => `- ${value}`), "")
  }
  if (item.implemented.length) {
    lines.push("**Implemented controls**", "", ...item.implemented.map((value) => `- ${value}`), "")
  }
  if (item.operatorActions.length) {
    lines.push("**Operator actions**", "", ...item.operatorActions.map((value) => `- ${value}`), "")
  }
}

writeFileSync("docs/compliance-controls.md", `${lines.join("\n")}\n`)
