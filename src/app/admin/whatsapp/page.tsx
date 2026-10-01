import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"

import { can } from "@/lib/access-control"
import { signInHref } from "@/lib/auth-redirect"
import { resolvePersistedRole } from "@/lib/rbac-store"
import {
  listWhatsAppPlatformEvents,
  listWhatsAppPlatformStatuses,
} from "@/lib/whatsapp-platform-store"
import { createServerSupabase } from "@/lib/supabase/server"

export const metadata: Metadata = { title: "WhatsApp health" }
export const dynamic = "force-dynamic"

export default async function Page() {
  const supabase = await createServerSupabase()
  const { data } = await supabase.auth.getUser()
  const email = data.user?.email
  const userId = data.user?.id

  if (!userId || !email) redirect(signInHref("/admin/whatsapp"))
  const role = await resolvePersistedRole(userId, email)
  if (!can(role, "compliance:manage")) {
    return (
      <div className="w-full px-3 py-8 md:px-4">
        <h1 className="text-2xl font-semibold tracking-tight">WhatsApp health</h1>
        <p className="mt-2 text-sm text-neutral-500">This account does not have the required administrative permission.</p>
      </div>
    )
  }

  const [statuses, events] = await Promise.all([
    listWhatsAppPlatformStatuses(),
    listWhatsAppPlatformEvents(50),
  ])

  return (
    <main className="w-full px-3 py-8 md:px-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-wide text-neutral-500 uppercase">Admin</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">WhatsApp health</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
            Enforcement events received from the WhatsApp Business Platform account_update webhook.
            The buyer-initiated wa.me flow is separate and does not send through the WABA.
          </p>
        </div>
        <a
          href="https://business.facebook.com/business-support-home"
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-9 items-center rounded-full border border-neutral-200 px-3 text-sm font-medium hover:bg-neutral-50"
        >
          Business Support Home
        </a>
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-medium">Current account status</h2>
        {statuses.length === 0 ? (
          <div className="mt-3 rounded-xl border border-dashed border-neutral-300 p-4 text-sm text-neutral-500">
            No WABA account_update event has been received yet.
          </div>
        ) : (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {statuses.map((status) => (
              <article key={status.wabaId} className="rounded-xl border border-neutral-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">WABA {status.wabaId}</p>
                  <span className="rounded-full bg-neutral-100 px-2 py-1 text-[11px] font-medium">
                    {status.state.replaceAll("_", " ")}
                  </span>
                </div>
                {status.policyName ? <p className="mt-3 text-sm text-neutral-700">{status.policyName}</p> : null}
                {status.summary ? <p className="mt-1 text-xs leading-5 text-neutral-500">{status.summary}</p> : null}
                <dl className="mt-3 grid gap-1 text-xs text-neutral-500">
                  <div className="flex justify-between gap-3">
                    <dt>Updated</dt>
                    <dd>{status.lastEventAt ? new Date(status.lastEventAt).toLocaleString() : "Unknown"}</dd>
                  </div>
                  {status.restrictionUntil ? (
                    <div className="flex justify-between gap-3">
                      <dt>Restriction until</dt>
                      <dd>{new Date(status.restrictionUntil).toLocaleString()}</dd>
                    </div>
                  ) : null}
                </dl>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-medium">Recent enforcement events</h2>
          <Link href="/admin/reports" className="text-sm text-neutral-500 hover:text-neutral-900">
            Listing reports
          </Link>
        </div>
        <div className="mt-3 overflow-hidden rounded-xl border border-neutral-200">
          {events.length === 0 ? (
            <p className="p-4 text-sm text-neutral-500">No events recorded.</p>
          ) : (
            <div className="divide-y divide-neutral-100">
              {events.map((event) => (
                <article key={String(event.id)} className="grid gap-1 p-4 md:grid-cols-[180px_150px_1fr] md:gap-4">
                  <div>
                    <p className="text-sm font-medium">{String(event.waba_id)}</p>
                    <p className="text-xs text-neutral-500">{new Date(String(event.received_at)).toLocaleString()}</p>
                  </div>
                  <p className="text-sm">{String(event.enforcement_state).replaceAll("_", " ")}</p>
                  <div>
                    {event.policy_name ? <p className="text-sm text-neutral-700">{String(event.policy_name)}</p> : null}
                    {event.summary ? <p className="mt-1 text-xs leading-5 text-neutral-500">{String(event.summary)}</p> : null}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
