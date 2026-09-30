"use client"

import { useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { ComplianceIncident } from "@/lib/compliance-incident-types"
import { complianceIncidentSeverities } from "@/lib/compliance-incident-types"

export function AdminComplianceIncidents({
  initialIncidents,
  loadError,
}: {
  initialIncidents: ComplianceIncident[]
  loadError: boolean
}) {
  const [incidents, setIncidents] = useState(initialIncidents)
  const [title, setTitle] = useState("")
  const [severity, setSeverity] = useState<(typeof complianceIncidentSeverities)[number]>("medium")
  const [discoveredAt, setDiscoveredAt] = useState(() => new Date().toISOString().slice(0, 16))
  const [personalData, setPersonalData] = useState(false)
  const [sensitiveData, setSensitiveData] = useState(false)
  const [affected, setAffected] = useState("")
  const [jurisdictions, setJurisdictions] = useState("")
  const [description, setDescription] = useState("")
  const [creating, setCreating] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [assessments, setAssessments] = useState<Record<string, string>>({})
  const [regulatorRequired, setRegulatorRequired] = useState<Record<string, "" | "yes" | "no">>({})
  const [usersRequired, setUsersRequired] = useState<Record<string, "" | "yes" | "no">>({})

  async function create() {
    setCreating(true)
    try {
      const response = await fetch("/api/admin/compliance/incidents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title,
          severity,
          discoveredAt: new Date(discoveredAt).toISOString(),
          personalDataInvolved: personalData,
          sensitiveDataInvolved: sensitiveData,
          affectedPeopleEstimate: affected.trim() ? Number(affected) : null,
          jurisdictions: jurisdictions.split(",").map((item) => item.trim()).filter(Boolean),
          description,
        }),
      })
      const payload = (await response.json()) as { reason?: string; incident?: ComplianceIncident }
      if (!response.ok || !payload.incident) {
        toast.error(payload.reason ?? "Could not create incident.")
        return
      }
      setIncidents((current) => [payload.incident!, ...current])
      setTitle("")
      setDescription("")
      setAffected("")
      setJurisdictions("")
      setPersonalData(false)
      setSensitiveData(false)
      toast.success("Incident record created")
    } catch {
      toast.error("Could not create incident.")
    } finally {
      setCreating(false)
    }
  }

  async function act(
    incidentId: string,
    action: "investigate" | "contain" | "assess" | "regulator_notified" | "users_notified" | "close",
  ) {
    setBusyId(incidentId)
    try {
      const regulator = regulatorRequired[incidentId]
      const users = usersRequired[incidentId]
      const response = await fetch("/api/admin/compliance/incidents", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          incidentId,
          action,
          assessment: assessments[incidentId]?.trim() || null,
          regulatorNotificationRequired:
            regulator === "yes" ? true : regulator === "no" ? false : null,
          userNotificationRequired:
            users === "yes" ? true : users === "no" ? false : null,
        }),
      })
      const payload = (await response.json()) as { reason?: string; incidents?: ComplianceIncident[] }
      if (!response.ok) {
        toast.error(payload.reason ?? "Could not update incident.")
        return
      }
      setIncidents(Array.isArray(payload.incidents) ? payload.incidents : [])
      toast.success("Incident updated")
    } catch {
      toast.error("Could not update incident.")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 md:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Compliance incidents</h1>
      <p className="mt-1 max-w-3xl text-sm leading-6 text-neutral-500">
        Operational incident register. Record discovery promptly, assess affected data and jurisdictions,
        then document notification decisions. This register does not determine a legal deadline by itself.
      </p>

      <section className="mt-6 rounded-2xl border border-neutral-200 bg-white p-4">
        <h2 className="font-medium text-neutral-950">New incident</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="incident-title">Title</Label>
            <Input id="incident-title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="incident-severity">Severity</Label>
            <select
              id="incident-severity"
              className="h-10 rounded-md border border-neutral-200 bg-white px-3 text-sm"
              value={severity}
              onChange={(e) => setSeverity(e.target.value as (typeof complianceIncidentSeverities)[number])}
            >
              {complianceIncidentSeverities.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="incident-discovered">Discovered at</Label>
            <Input
              id="incident-discovered"
              type="datetime-local"
              value={discoveredAt}
              onChange={(e) => setDiscoveredAt(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="incident-affected">Estimated affected people</Label>
            <Input id="incident-affected" inputMode="numeric" value={affected} onChange={(e) => setAffected(e.target.value)} />
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-sm text-neutral-700">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={personalData} onChange={(e) => setPersonalData(e.target.checked)} />
            Personal data involved
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={sensitiveData} onChange={(e) => setSensitiveData(e.target.checked)} />
            Sensitive data involved
          </label>
        </div>
        <div className="mt-3 grid gap-1.5">
          <Label htmlFor="incident-jurisdictions">Potential jurisdictions</Label>
          <Input
            id="incident-jurisdictions"
            value={jurisdictions}
            onChange={(e) => setJurisdictions(e.target.value)}
            placeholder="Kenya, EU/EEA, California"
          />
        </div>
        <div className="mt-3 grid gap-1.5">
          <Label htmlFor="incident-description">What happened</Label>
          <Textarea
            id="incident-description"
            rows={4}
            maxLength={5000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <Button
          type="button"
          className="mt-3"
          disabled={creating || title.trim().length < 3 || !description.trim() || !discoveredAt}
          onClick={() => void create()}
        >
          {creating ? "Creating…" : "Create incident record"}
        </Button>
      </section>

      {loadError ? <p className="mt-5 text-sm text-rose-600">Could not load incidents.</p> : null}

      <ul className="mt-6 grid gap-3">
        {incidents.map((incident) => (
          <li key={incident.id} className="rounded-2xl border border-neutral-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-medium text-neutral-950">{incident.title}</h2>
                  <span className="rounded-full bg-neutral-100 px-2 py-1 text-xs">{incident.severity}</span>
                  <span className="rounded-full bg-neutral-100 px-2 py-1 text-xs">{incident.status}</span>
                </div>
                <p className="mt-1 text-xs text-neutral-500">
                  Discovered {new Date(incident.discoveredAt).toLocaleString()}
                  {incident.containedAt ? ` · Contained ${new Date(incident.containedAt).toLocaleString()}` : ""}
                </p>
              </div>
            </div>

            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-neutral-700">{incident.description}</p>

            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <Fact label="Personal data" value={incident.personalDataInvolved ? "Yes" : "No / unknown"} />
              <Fact label="Sensitive data" value={incident.sensitiveDataInvolved ? "Yes" : "No / unknown"} />
              <Fact label="Affected people estimate" value={incident.affectedPeopleEstimate == null ? "Unknown" : String(incident.affectedPeopleEstimate)} />
              <Fact label="Jurisdictions" value={incident.jurisdictions.join(", ") || "Not assessed"} />
              <Fact label="Regulator notification" value={notificationLabel(incident.regulatorNotificationRequired, incident.regulatorNotifiedAt)} />
              <Fact label="User notification" value={notificationLabel(incident.userNotificationRequired, incident.usersNotifiedAt)} />
            </dl>

            <div className="mt-4 grid gap-2">
              <Label htmlFor={`assessment-${incident.id}`}>Assessment / rationale</Label>
              <Textarea
                id={`assessment-${incident.id}`}
                maxLength={5000}
                value={assessments[incident.id] ?? incident.assessment ?? ""}
                onChange={(e) => setAssessments((current) => ({ ...current, [incident.id]: e.target.value }))}
                placeholder="Risk, data categories, likely consequences, containment, legal notification analysis, counsel/regulator contacts."
              />
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Decision
                label="Regulator notification required?"
                value={regulatorRequired[incident.id] ?? boolChoice(incident.regulatorNotificationRequired)}
                onChange={(value) => setRegulatorRequired((current) => ({ ...current, [incident.id]: value }))}
              />
              <Decision
                label="Affected-user notification required?"
                value={usersRequired[incident.id] ?? boolChoice(incident.userNotificationRequired)}
                onChange={(value) => setUsersRequired((current) => ({ ...current, [incident.id]: value }))}
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {incident.status === "open" ? (
                <Button variant="outline" disabled={busyId === incident.id} onClick={() => void act(incident.id, "investigate")}>
                  Start investigation
                </Button>
              ) : null}
              {!incident.containedAt && incident.status !== "closed" ? (
                <Button variant="outline" disabled={busyId === incident.id} onClick={() => void act(incident.id, "contain")}>
                  Mark contained
                </Button>
              ) : null}
              <Button variant="outline" disabled={busyId === incident.id} onClick={() => void act(incident.id, "assess")}>
                Save assessment
              </Button>
              {incident.regulatorNotificationRequired === true && !incident.regulatorNotifiedAt ? (
                <Button variant="outline" disabled={busyId === incident.id} onClick={() => void act(incident.id, "regulator_notified")}>
                  Record regulator notification
                </Button>
              ) : null}
              {incident.userNotificationRequired === true && !incident.usersNotifiedAt ? (
                <Button variant="outline" disabled={busyId === incident.id} onClick={() => void act(incident.id, "users_notified")}>
                  Record user notification
                </Button>
              ) : null}
              {incident.status !== "closed" ? (
                <Button disabled={busyId === incident.id} onClick={() => void act(incident.id, "close")}>
                  Close incident
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      {!loadError && incidents.length === 0 ? (
        <p className="mt-6 rounded-xl border border-neutral-200 bg-white px-4 py-8 text-center text-sm text-neutral-500">
          No compliance incidents recorded.
        </p>
      ) : null}
    </div>
  )
}

function Decision({
  label,
  value,
  onChange,
}: {
  label: string
  value: "" | "yes" | "no"
  onChange: (value: "" | "yes" | "no") => void
}) {
  return (
    <label className="grid gap-1 text-xs font-medium text-neutral-600">
      {label}
      <select
        className="h-10 rounded-md border border-neutral-200 bg-white px-3 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value as "" | "yes" | "no")}
      >
        <option value="">Not assessed</option>
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </select>
    </label>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-neutral-100 py-1">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="text-right text-neutral-800">{value}</dd>
    </div>
  )
}

function notificationLabel(required: boolean | null, notifiedAt: string | null) {
  if (notifiedAt) return `Sent ${new Date(notifiedAt).toLocaleString()}`
  if (required === true) return "Required — not yet recorded"
  if (required === false) return "Assessed not required"
  return "Not assessed"
}

function boolChoice(value: boolean | null): "" | "yes" | "no" {
  return value === true ? "yes" : value === false ? "no" : ""
}
