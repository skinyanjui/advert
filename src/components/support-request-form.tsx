"use client"

import { useState, type FormEvent } from "react"
import { Loader2 } from "lucide-react"

import { FormField } from "@/components/form-field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { supportCategories, type SupportCategory } from "@/lib/support"

const categoryLabels: Record<SupportCategory, string> = {
  account: "Account & general help",
  moderation: "Listings & moderation",
  safety: "Safety & abuse",
  security: "Security",
  legal: "Legal & compliance",
  general: "General help",
}

export function SupportRequestForm() {
  const [category, setCategory] = useState<SupportCategory>("account")
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [website, setWebsite] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [acknowledgment, setAcknowledgment] = useState<{ id?: string; message: string } | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError("")
    setAcknowledgment(null)
    try {
      const response = await fetch("/api/support", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ category, email, message, website }),
      })
      const payload = (await response.json()) as { reason?: string; requestId?: string; message?: string; acknowledged?: boolean }
      if (!response.ok || !payload.acknowledged) {
        setError(payload.reason ?? "Support could not receive your request.")
        return
      }
      setAcknowledgment({
        id: payload.requestId,
        message: payload.message ?? "Your support request was received.",
      })
      setMessage("")
    } catch {
      setError("Support could not receive your request. Check your connection and try again.")
    } finally {
      setBusy(false)
    }
  }

  if (acknowledgment) {
    return (
      <div id="support-request" role="status" tabIndex={-1} className="rounded-xl border border-border bg-card p-4">
        <h2 className="text-base font-semibold">Request received</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{acknowledgment.message}</p>
        {acknowledgment.id ? <p className="mt-2 text-xs text-muted-foreground">Reference: {acknowledgment.id}</p> : null}
        <Button type="button" variant="outline" className="mt-4 rounded-full" onClick={() => setAcknowledgment(null)}>
          Send another request
        </Button>
      </div>
    )
  }

  return (
    <form id="support-request" onSubmit={submit} className="grid gap-4 rounded-xl border border-border bg-card p-4" aria-describedby="support-response-expectation">
      <div>
        <h2 className="text-base font-semibold">Contact support</h2>
        <p id="support-response-expectation" className="mt-1 text-sm leading-6 text-muted-foreground">
          Requests enter the staffed support queue. Security and safety reports are triaged by category. Response time depends on severity and available staff.
        </p>
      </div>

      <FormField id="support-category" label="What do you need help with?" required>
        {(control) => (
          <select
            id={control.id}
            value={category}
            onChange={(event) => setCategory(event.target.value as SupportCategory)}
            aria-describedby={control.describedBy}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {supportCategories.map((value) => <option key={value} value={value}>{categoryLabels[value]}</option>)}
          </select>
        )}
      </FormField>

      <FormField id="support-email" label="Email" required hint="Use an address where support can reach you.">
        {(control) => (
          <Input
            id={control.id}
            type="email"
            autoComplete="email"
            required
            maxLength={320}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-describedby={control.describedBy}
          />
        )}
      </FormField>

      <FormField id="support-message" label="How can we help?" required hint="Include the listing URL or account email when it helps us investigate.">
        {(control) => (
          <Textarea
            id={control.id}
            required
            minLength={10}
            maxLength={4000}
            rows={6}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            aria-describedby={control.describedBy}
          />
        )}
      </FormField>

      <div className="hidden" aria-hidden="true">
        <label htmlFor="support-website">Website</label>
        <input id="support-website" tabIndex={-1} autoComplete="off" value={website} onChange={(event) => setWebsite(event.target.value)} />
      </div>

      {category === "safety" ? (
        <p className="text-xs leading-5 text-muted-foreground">
          If there is an immediate threat to life or physical safety, contact the appropriate local emergency service first.
        </p>
      ) : null}
      {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
      <Button type="submit" disabled={busy} className="w-fit rounded-full">
        {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        {busy ? "Sending…" : "Send request"}
      </Button>
      <p className="text-xs leading-5 text-muted-foreground">
        Do not send passwords, payment-card numbers, government ID numbers, medical records, or other unnecessary sensitive information.
      </p>
    </form>
  )
}
