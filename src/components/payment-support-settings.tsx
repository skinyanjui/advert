"use client"

import { useEffect, useState } from "react"
import { usePrefs } from "@/components/prefs-provider"
import { marketplacePolicy } from "@/lib/marketplace-policy"
import { Button } from "@/components/ui/button"

type SupportStatus = { email: string | null; verified: boolean; verifiedAt: string | null; available: boolean; deliveryConfigured: boolean }

export function PaymentSupportSettings() {
  const { t } = usePrefs()
  const [status, setStatus] = useState<SupportStatus>()
  const [code, setCode] = useState("")
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  useEffect(() => {
    let active = true
    void fetch("/api/admin/payment-support", { cache: "no-store" }).then(async response => {
      if (!response.ok) throw new Error(t("paymentSupport.loadError"))
      const data = await response.json()
      if (active) setStatus(data)
    }).catch(e => { if (active) setError(e.message) })
    return () => { active = false }
  }, [t])
  async function submit(action: "send" | "confirm") {
    setBusy(true); setError(""); setMessage("")
    try {
      const response = await fetch("/api/admin/payment-support", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, code }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.reason ?? t("paymentSupport.verifyError"))
      setStatus(data); setCode("")
      setMessage(action === "send" ? t("paymentSupport.sent") : t("paymentSupport.confirmed"))
    } catch (e) { setError(e instanceof Error ? e.message : t("paymentSupport.verifyError")) }
    finally { setBusy(false) }
  }
  return <section className="space-y-3 rounded-lg border border-border bg-card p-4">
    <h2 className="font-semibold">{t("paymentSupport.title")}</h2>
    <p className="text-sm text-muted-foreground">{t("paymentSupport.hint", { days: marketplacePolicy.paymentSupport.verificationDays })}</p>
    {status ? <p className="text-sm">{status.email ?? t("paymentSupport.missingAddress")} · {status.verified ? t("paymentSupport.verified") : t("paymentSupport.required")}</p> : null}
    {status && (!status.available || !status.deliveryConfigured) ? <p className="text-sm text-muted-foreground">{t("paymentSupport.setupHint")}</p> : null}
    <Button variant="outline" disabled={busy || !status?.email || !status.available || !status.deliveryConfigured} onClick={() => void submit("send")}>{t("paymentSupport.send")}</Button>
    <label className="block text-sm">{t("paymentSupport.code")}<input autoComplete="off" value={code} onChange={event => setCode(event.target.value)} maxLength={64} className="mt-1 block w-full rounded-md border border-input bg-background p-2" /></label>
    <Button disabled={busy || !/^[a-f0-9]{64}$/i.test(code.trim())} onClick={() => void submit("confirm")}>{t("paymentSupport.confirm")}</Button>
    {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    {message ? <p role="status" className="text-sm">{message}</p> : null}
  </section>
}
