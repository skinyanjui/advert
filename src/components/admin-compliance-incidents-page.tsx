"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import {
  complianceIncidentSeverities,
  incidentStatusLabel,
  type ComplianceIncident,
  type ComplianceIncidentSeverity,
} from "@/lib/compliance-incident-types"

export function AdminComplianceIncidentsPage({
  initialIncidents,
  loadError,
}: {
  initialIncidents: ComplianceIncident[]
  loadError: boolean
}) {
  const [incidents, setIncidents] = useState(initialIncidents)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [title, setTitle] = useState("")
  const [severity, setSeverity] = useState<ComplianceIncidentSeverity>("medium")
  const [discoveredAt, setDiscoveredAt] = useState(new Date().toISOString().slice(0, 16))
  const [description, setDescription] = useState("")
  const [personalData, setPersonalData] = useState(false)
  const [sensitiveData, setSensitiveData] = useState(false)
  const [affectedPeople, setAffectedPeople] = useState("")
  const [jurisdictions, setJurisdictions] = useState("")
  const [assessments, setAssessments] = useState<Record<string, string>>({})
  const [regulatorRequired, setRegulatorRequired] = useState<Record<string, "yes" | "no" | "unknown">>({})
  const [usersRequired, setUsersRequired] = useState<Record<string, "yes" | "no" | "unknown">>({})

  const openCount = useMemo(
    () => incidents.filter((incident) => incident.status !== "closed").length,
    [incidents],
  )

  async function create() {
    if (creating) return
    setCreating(true)
    try {
      const response = await fetch("/api/admin/compliance-incidents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title,
          severity,
          discoveredAt,
          description,
          personalDataInvolved: personalData,
          sensitiveDataInvolved: sensitiveData,
          affectedPeopleEstimate: affectedPeople.trim() ? Number(affectedPeople) : null,
          jurisdictions: jurisdictions.split(",").map((value) => value.trim()).filter(Boolean),
        }),
      })
      const payload = (await response.json()) as { reason?: string; incidents?: ComplianceIncident[] }
      if (!response.ok) {
        toast.error(payload.reason ?? "Could not create the incident.")
        return
      }
      setIncidents(Array.isArray(payload.incidents) ? payload.incidents : [])
      setTitle("")
      setDescription("")
      setAffectedPeople("")
      setJurisdictions("")
      setPersonalData(false)
      setSensitiveData(false)
      toast.success("Incident recorded")
    } catch {
      toast.error("Could not create the incident.")
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
      const regulatorChoice = regulatorRequired[incidentId] ?? "unknown"
      const usersChoice = usersRequired[incidentId] ?? "unknown"
      const response = await fetch("/api/admin/compliance-incidents", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          incidentId,
          action,
          assessment: assessments[incidentId]?.trim() || null,
          regulatorNotificationRequired:
            regulatorChoice === "unknown" ? null : regulatorChoice === "yes",
          userNotificationRequired:
            usersChoice === "unknown" ? null : usersChoice === "yes",
        }),
      })
      const payload = (await response.json()) as { reason?: string; incidents?: ComplianceIncident[] }
      if (!response.ok) {
        toast.error(payload.reason ?? "Could not update the incident.")
        return
      }
      setIncidents(Array.isArray(payload.incidents) ? payload.incidents : [])
      toast.success("Incident updated")
    } catch {
      toast.error("Could not update the incident.")
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="w-full px-3 py-8 md:px-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Compliance incidents</h1>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-neutral-500">
          Internal incident log for security, privacy, legal, or platform events. This workflow records facts and notification decisions; it does not automatically determine whether a regulator or user notice is legally required.
        </p>
        <p className="mt-2 text-sm text-neutral-500">{openCount} open or active incident{openCount === 1 ? "" : "s"}</p>
      </header>

      <section className="mt-6 rounded-2xl border border-neutral-200 bg-white p-4">
        <h2 className="font-medium text-neutral-950">Record incident</h2>
        <div className="mt-4 grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="incident-title">Title</Label>
              <Input id="incident-title" value={title} maxLength={200} onChange={(event) => setTitle(event.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="incident-severity">Severity</Label>
              <Select value={severity} onValueChange={(value) => setSeverity(value as ComplianceIncidentSeverity)}>
                <SelectTrigger id="incident-severity"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {complianceIncidentSeverities.map((value) => (
                    <SelectItem key={value} value={value}>{value}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="incident-discovered">Discovered at</Label>
            <Input id="incident-discovered" type="datetime-local" value={discoveredAt} onChange={(event) => setDiscoveredAt(event.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="incident-description">What happened?</Label>
            <Textarea
              id="incident-description"
              value={description}
              maxLength={5000}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Record known facts, systems affected, detection source, and immediate actions. Do not include passwords or raw secrets."
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-start gap-2 text-sm text-neutral-700">
              <input type="checkbox" className="mt-0.5 size-4" checked={personalData} onChange={(event) => setPersonalData(event.target.checked)} />
              Personal data may be involved
            </label>
            <label className="flex items-start gap-2 text-sm text-neutral-700">
              <input type="checkbox" className="mt-0.5 size-4" checked={sensitiveData} onChange={(event) => setSensitiveData(event.target.checked)} />
              Sensitive data may be involved
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="incident-affected">Estimated affected people</Label>
              <Input id="incident-affected" inputMode="numeric" value={affectedPeople} onChange={(event) => setAffectedPeople(event.target.value.replace(/[^0-9]/g, ""))} placeholder="Unknown is okay" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="incident-jurisdictions">Potential jurisdictions</Label>
              <Input id="incident-jurisdictions" value={jurisdictions} onChange={(event) => setJurisdictions(event.target.value)} placeholder="Kenya, California, EU" />
            </div>
          </div>
          <Button disabled={creating || title.trim().length < 3 || !description.trim()} onClick={() => void create()}>
            {creating ? "Recording…" : "Record incident"}
          </Button>
        </div>
      </section>

      {loadError ? <p className="mt-5 text-sm text-rose-600">Could not load incident records.</p> : null}

      <div className="mt-6 grid gap-4">
        {incidents.map((incident) => (
          <section key={incident.id} className="rounded-2xl border border-neutral-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-medium text-neutral-950">{incident.title}</h2>
                  <span className="rounded-full bg-neutral-100 px-2 py-1 text-xs">{incident.severity}</span>
                  <span className="rounded-full bg-neutral-100 px-2 py-1 text-xs">{incidentStatusLabel(incident.status)}</span>
                </div>
                <p className="mt-1 text-xs text-neutral-500">
                  Discovered {new Date(incident.discoveredAt).toLocaleString()} · ID {incident.id}
                </p>
              </div>
            </div>

            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-neutral-700">{incident.description}</p>
            <dl className="mt-3 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              <Fact label="Personal data" value={incident.personalDataInvolved ? "Potentially involved" : "Not marked"} />
              <Fact label="Sensitive data" value={incident.sensitiveDataInvolved ? "Potentially involved" : "Not marked"} />
              <Fact label="Affected people" value={incident.affectedPeopleEstimate === null ? "Unknown" : String(incident.affectedPeopleEstimate)} />
              <Fact label="Jurisdictions" value={incident.jurisdictions.join(", ") || "Not yet identified"} />
              <Fact label="Regulator notice" value={notificationLabel(incident.regulatorNotificationRequired, incident.regulatorNotifiedAt)} />
              <Fact label="User notice" value={notificationLabel(incident.userNotificationRequired, incident.usersNotifiedAt)} />
            </dl>

            <div className="mt-4 grid gap-2">
              <Label htmlFor={`assessment-${incident.id}`}>Assessment / decision record</Label>
              <Textarea
                id={`assessment-${incident.id}`}
                value={assessments[incident.id] ?? incident.assessment ?? ""}
                maxLength={5000}
                onChange={(event) => setAssessments((current) => ({ ...current, [incident.id]: event.target.value }))}
                placeholder="Assess likely impact, containment, applicable laws, deadlines, and reasons for notification decisions."
              />
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Choice
                label="Regulator notification required?"
                value={regulatorRequired[incident.id] ?? toChoice(incident.regulatorNotificationRequired)}
                onChange={(value) => setRegulatorRequired((current) => ({ ...current, [incident.id]: value }))}
              />
              <Choice
                label="User notification required?"
                value={usersRequired[incident.id] ?? toChoice(incident.userNotificationRequired)}
                onChange={(value) => setUsersRequired((current) => ({ ...current, [incident.id]: value }))}
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {incident.status === "open" ? (
                <Button variant="outline" disabled={busyId === incident.id} onClick={() => void act(incident.id, "investigate")}>Start investigation</Button>
              ) : null}
              {incident.status !== "closed" && !incident.containedAt ? (
                <Button variant="outline" disabled={busyId === incident.id} onClick={() => void act(incident.id, "contain")}>Mark contained</Button>
              ) : null}
              {incident.status !== "closed" ? (
                <Button variant="outline" disabled={busyId === incident.id} onClick={() => void act(incident.id, "assess")}>Save assessment</Button>
              ) : null}
              {incident.regulatorNotificationRequired === true && !incident.regulatorNotifiedAt ? (
                <Button variant="outline" disabled={busyId === incident.id} onClick={() => void act(incident.id, "regulator_notified")}>Record regulator notice</Button>
              ) : null}
              {incident.userNotificationRequired === true && !incident.usersNotifiedAt ? (
                <Button variant="outline" disabled={busyId === incident.id} onClick={() => void act(incident.id, "users_notified")}>Record user notice</Button>
              ) : null}
              {incident.status !== "closed" ? (
                <Button disabled={busyId === incident.id} onClick={() => void act(incident.id, "close")}>Close incident</Button>
              ) : null}
            </div>
          </section>
        ))}
      </div>
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

function Choice({
  label,
  value,
  onChange,
}: {
  label: string
  value: "yes" | "no" | "unknown"
  onChange: (value: "yes" | "no" | "unknown") => void
}) {
  return (
    <label className="grid gap-1.5 text-sm text-neutral-700">
      {label}
      <select
        className="h-10 rounded-md border border-neutral-200 bg-white px-3"
        value={value}
        onChange={(event) => onChange(event.target.value as "yes" | "no" | "unknown")}
      >
        <option value="unknown">Undetermined</option>
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </select>
    </label>
  )
}

function toChoice(value: boolean | null): "yes" | "no" | "unknown" {
  return value === true ? "yes" : value === false ? "no" : "unknown"
}

function notificationLabel(required: boolean | null, sentAt: string | null): string {
  if (sentAt) return `Recorded ${new Date(sentAt).toLocaleString()}`
  if (required === true) return "Required — not yet recorded"
  if (required === false) return "Assessed not required"
  return "Undetermined"
}
