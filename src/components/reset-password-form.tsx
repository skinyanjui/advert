"use client"

import { Loader2 } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { EmptyPanel } from "@/components/empty-panel"
import { FormField } from "@/components/form-field"
import { usePrefs } from "@/components/prefs-provider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth"
import { signInHref } from "@/lib/auth-redirect"
import {
  passwordError,
  passwordStrength,
  passwordStrengthLabel,
  passwordsMatchError,
} from "@/lib/password"

export function ResetPasswordForm() {
  const auth = useAuth()
  const { t } = usePrefs()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [busy, setBusy] = useState(false)
  const claimed = searchParams.get("claimed") === "1"
  const deviceError = searchParams.get("error") === "device"

  useEffect(() => {
    if (deviceError) {
      toast.error(t("auth.toast.resetWrongDevice"))
    } else if (auth.ready && !auth.signedIn && !claimed) {
      toast.error(t("auth.toast.resetOpenLink"))
    }
  }, [auth.ready, auth.signedIn, claimed, deviceError, t])

  if (!auth.configured) {
    return (
      <EmptyPanel
        title={t("auth.notConfiguredTitle")}
        body={t("auth.resetNotConfiguredBody")}
        actionHref="/"
        actionLabel={t("auth.backHome")}
        className="mt-0 py-10"
        headingLevel={1}
      />
    )
  }

  if (auth.ready && !auth.signedIn) {
    return (
      <EmptyPanel
        title={deviceError ? t("auth.resetDeviceTitle") : t("auth.resetLinkRequiredTitle")}
        body={deviceError ? t("auth.resetDeviceBody") : t("auth.resetLinkRequiredBody")}
        actionHref={signInHref("/auth/reset")}
        actionLabel={t("auth.requestNewReset")}
        className="mt-0 py-10"
        headingLevel={1}
      >
        <p className="mx-auto mt-4 max-w-sm text-sm text-muted-foreground">
          {t("auth.orSignInPrefix")}{" "}
          <Link href="/sign-in" className="font-medium underline underline-offset-2">
            {t("auth.signIn")}
          </Link>{" "}
          {t("auth.orSignInSuffix")}
        </p>
      </EmptyPanel>
    )
  }

  const strength = password ? passwordStrength(password) : null

  async function submit() {
    const reason = passwordError(password) ?? passwordsMatchError(password, confirm)
    if (reason) {
      toast.error(reason)
      return
    }
    setBusy(true)
    const result = await auth.updatePassword(password)
    setBusy(false)
    if (!result.ok) {
      toast.error(result.reason)
      return
    }
    toast.success(t("auth.toast.passwordUpdated"))
    router.replace("/account")
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{t("auth.chooseNewPassword")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("auth.chooseNewPasswordHint")}</p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>{t("auth.newPasswordTitle")}</CardTitle>
          <CardDescription>{t("auth.newPasswordHint")}</CardDescription>
        </CardHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (busy) return
            void submit()
          }}
        >
          <CardContent className="space-y-4">
            <FormField
              label={t("auth.password")}
              htmlFor="reset-password"
              required
              hint={strength ? passwordStrengthLabel(strength) : undefined}
            >
              <Input
                id="reset-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-10"
                required
              />
            </FormField>
            <FormField label={t("auth.confirmPassword")} htmlFor="reset-password-confirm" required>
              <Input
                id="reset-password-confirm"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                className="h-10"
                required
              />
            </FormField>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={busy} className="h-10 w-full">
              {busy ? <Loader2 className="animate-spin" /> : null}
              {busy ? t("profile.saving") : t("auth.updatePassword")}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
