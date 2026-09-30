import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"

import { isAdminEmail } from "@/lib/admin"
import { signInHref } from "@/lib/auth-redirect"
import {
  complianceConfiguration,
  complianceFacts,
  complianceItems,
  type ComplianceState,
} from "@/lib/compliance"
import { createServerSupabase } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "Compliance" }
export const dynamic = "force-dynamic"

function stateLabel(state: ComplianceState) {
  if (state === "implemented") return "Implemented / current-state control"
  if (state === "conditional") return "Conditional / monitor triggers"
  return "Operator action required"
}

export default async function Page() {
  const supabase = await createServerSupabase()
  const { data } = await supabase.auth.getUser()
  const email = data.user?.email
  const userId = data.user?.id

  if (!userId || !email) redirect(signInHref("/admin/compliance"))

  if (!isAdminEmail(email)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Compliance</h1>
        <p className="mt-2 text-sm text-neutral-500">This account is not on the admin allowlist.</p>
      </div>
    )
  }

  const config = complianceConfiguration()
  const items = complianceItems()

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Compliance</h1>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link href="/admin/privacy" className="inline-flex h-9 items-center rounded-full border border-neutral-200 bg-white px-3 text-sm font-medium">
          Privacy requests
        </Link>
        <Link href="/admin/moderation-appeals" className="inline-flex h-9 items-center rounded-full border border-neutral-200 bg-white px-3 text-sm font-medium">
          Moderation appeals
        </Link>
        <Link href="/admin/incidents" className="inline-flex h-9 items-center rounded-full border border-neutral-200 bg-white px-3 text-sm font-medium">
          Compliance incidents
        </Link>
      </div>
      <p className="mt-4 max-w-3xl text-sm leading-6 text-neutral-500">
        Operational law-to-product registry. “Implemented” means the named product control exists; it does not mean a regulator or lawyer has certified legal compliance. Conditional duties must be re-evaluated when product facts or scale change.
      </p>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link href="/admin/privacy" className="inline-flex h-9 items-center rounded-full border border-neutral-200 bg-white px-3 text-sm font-medium">
          Privacy requests
        </Link>
        <Link href="/admin/incidents" className="inline-flex h-9 items-center rounded-full border border-neutral-200 bg-white px-3 text-sm font-medium">
          Compliance incidents
        </Link>
        <Link href="/admin/reports" className="inline-flex h-9 items-center rounded-full border border-neutral-200 bg-white px-3 text-sm font-medium">
          Listing reports
        </Link>
      </div>

      <section className="mt-6 rounded-2xl border border-neutral-200 bg-white p-4">
        <h2 className="font-medium text-neutral-950">Current product facts</h2>
        <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <Fact label="Minimum account age" value={String(complianceFacts.accountMinimumAge)} />
          <Fact label="Processes buyer purchase payments" value={yesNo(complianceFacts.paymentProcessing)} />
          <Fact label="Marketing email active" value={yesNo(complianceFacts.marketingEmail)} />
          <Fact label="Marketing robotext/call active" value={yesNo(complianceFacts.marketingRobotexts)} />
          <Fact label="Third-party advertising pixels" value={yesNo(complianceFacts.thirdPartyAdPixels)} />
          <Fact label="Sells personal information" value={yesNo(complianceFacts.sellsPersonalInformation)} />
          <Fact label="Cross-context behavioral advertising" value={yesNo(complianceFacts.crossContextBehavioralAdvertising)} />
          <Fact label="Significant-decision ADMT" value={yesNo(complianceFacts.significantDecisionAdmt)} />
          <Fact label="Safety moderation automation" value={yesNo(complianceFacts.safetyModerationAutomation)} />
          <Fact label="GPC recognized" value={yesNo(complianceFacts.gpcRecognized)} />
          <Fact label="DNT disclosure current" value={yesNo(complianceFacts.dntDisclosed)} />
          <Fact label="Privacy rights workflow" value={yesNo(complianceFacts.privacyRightsWorkflow)} />
          <Fact label="Structured illegal-content notice" value={yesNo(complianceFacts.structuredIllegalContentNotice)} />
          <Fact label="Moderation redress / appeals" value={yesNo(complianceFacts.moderationRedress)} />
        </dl>
      </section>

      <section className="mt-4 rounded-2xl border border-neutral-200 bg-white p-4">
        <h2 className="font-medium text-neutral-950">Required configuration</h2>
        <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <Fact label="Public privacy/support email" value={configured(config.supportEmail)} />
          <Fact label="Controller legal name" value={configured(config.operatorName)} />
          <Fact label="Controller business address" value={configured(config.operatorAddress)} />
          <Fact label="DMCA agent contact details" value={configured(config.dmcaAgentDetails)} />
          <Fact label="DMCA registration confirmed" value={configured(config.dmcaAgentRegistered)} />
          <Fact label="EU representative" value={config.euRepresentative ? "Configured" : "Not configured / may not be required"} />
          <Fact label="DPO contact" value={config.dpoContact ? "Configured" : "Not configured / may not be required"} />
          <Fact label="Supabase leaked-password protection" value="Operator action: audit reported disabled" />
          <Fact label="Counsel-approved French legal documents" value="Missing" />
          <Fact label="Counsel-approved Swahili legal documents" value="Missing" />
        </dl>
      </section>

      <div className="mt-6 grid gap-4">
        {items.map((item) => (
          <section key={item.id} className="rounded-2xl border border-neutral-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-medium text-neutral-950">{item.law}</h2>
                <p className="mt-1 max-w-3xl text-sm text-neutral-500">{item.scope}</p>
              </div>
              <span
                className={
                  item.state === "implemented"
                    ? "rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-800"
                    : item.state === "operator_action"
                      ? "rounded-full bg-rose-50 px-2.5 py-1 text-xs text-rose-800"
                      : "rounded-full bg-amber-50 px-2.5 py-1 text-xs text-amber-800"
                }
              >
                {stateLabel(item.state)}
              </span>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <ListBlock title="Implemented controls" items={item.implemented} />
              <ListBlock title="Triggers to monitor" items={item.triggers} />
              <ListBlock title="Operator / legal actions" items={item.operatorActions} />
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{title}</h3>
      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-6 text-neutral-700">
        {items.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-neutral-100 py-1.5">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="text-right font-medium text-neutral-800">{value}</dd>
    </div>
  )
}

function yesNo(value: boolean) {
  return value ? "Yes" : "No"
}

function configured(value: boolean) {
  return value ? "Configured" : "Missing"
}
