"use client"

import Link from "next/link"
import { startTransition, useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

import { usePrefs } from "@/components/prefs-provider"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAuth } from "@/lib/auth"
import { LEGAL_EFFECTIVE_DATE, PRIVACY_VERSION, TERMS_VERSION } from "@/lib/legal"
import {
  TERMS_ACCEPTED_EVENT,
  TERMS_REACCEPT_EVENT,
  hasTermsIntent,
  rememberTermsIntent,
} from "@/lib/terms-client"

type TermsPayload = {
  current?: boolean
  tableMissing?: boolean
  reason?: string
}

export function TermsReacceptDialog() {
  const auth = useAuth()
  const { t } = usePrefs()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    if (!auth.ready || !auth.signedIn || !auth.configured) {
      startTransition(() => setOpen(false))
      return
    }
    // Skip while signup intent is still pending — acceptance POST runs right after sign-in.
    if (hasTermsIntent()) return
    try {
      const response = await fetch("/api/terms", { method: "GET" })
      if (!response.ok) return
      const payload = (await response.json()) as TermsPayload
      if (payload.tableMissing) {
        startTransition(() => setOpen(false))
        return
      }
      startTransition(() => setOpen(payload.current === false))
    } catch {
      // status check is best-effort
    }
  }, [auth.configured, auth.ready, auth.signedIn])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refresh()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [refresh])

  useEffect(() => {
    function onReaccept() {
      startTransition(() => setOpen(true))
    }
    function onAccepted() {
      void refresh()
    }
    window.addEventListener(TERMS_REACCEPT_EVENT, onReaccept)
    window.addEventListener(TERMS_ACCEPTED_EVENT, onAccepted)
    return () => {
      window.removeEventListener(TERMS_REACCEPT_EVENT, onReaccept)
      window.removeEventListener(TERMS_ACCEPTED_EVENT, onAccepted)
    }
  }, [refresh])

  async function accept() {
    setBusy(true)
    rememberTermsIntent()
    try {
      const response = await fetch("/api/terms", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ context: "reaccept" }),
      })
      const payload = (await response.json()) as TermsPayload
      if (!response.ok) {
        toast.error(payload.reason ?? t("terms.toast.error"))
        return
      }
      setOpen(false)
      toast.success(t("terms.toast.accepted"))
    } catch {
      toast.error(t("terms.toast.error"))
    } finally {
      setBusy(false)
    }
  }

  async function signOut() {
    setBusy(true)
    await auth.signOut()
    setOpen(false)
    setBusy(false)
  }

  if (!auth.signedIn) return null

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>{t("terms.reacceptTitle")}</DialogTitle>
          <DialogDescription>
            {t("terms.reacceptBody", {
              terms: TERMS_VERSION,
              privacy: PRIVACY_VERSION,
              date: LEGAL_EFFECTIVE_DATE,
            })}
          </DialogDescription>
        </DialogHeader>
        <p className="text-sm text-neutral-600">
          {t("terms.reacceptRead")}{" "}
          <Link href="/terms" className="underline underline-offset-2">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline underline-offset-2">
            Privacy Policy
          </Link>
          .
        </p>
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={() => void signOut()}>
            {t("terms.signOut")}
          </Button>
          <Button disabled={busy} onClick={() => void accept()}>
            {busy ? t("terms.pleaseWait") : t("terms.accept")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
