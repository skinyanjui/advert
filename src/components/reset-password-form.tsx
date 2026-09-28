"use client"

import { Loader2 } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { toast } from "sonner"

import { EmptyPanel } from "@/components/empty-panel"
import { FormField } from "@/components/form-field"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/lib/auth"
import {
  passwordError,
  passwordStrength,
  passwordStrengthLabel,
  passwordsMatchError,
} from "@/lib/password"

export function ResetPasswordForm() {
  const auth = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [busy, setBusy] = useState(false)
  const claimed = searchParams.get("claimed") === "1"

  useEffect(() => {
    if (auth.ready && !auth.signedIn && !claimed) {
      toast.error("Open the reset link from your email to choose a new password.")
    }
  }, [auth.ready, auth.signedIn, claimed])

  if (!auth.configured) {
    return (
      <EmptyPanel
        title="Sign-in is not configured"
        body="Password reset needs Supabase Auth credentials."
        actionHref="/"
        actionLabel="Back home"
        className="mt-0 py-10"
        headingLevel={1}
      />
    )
  }

  if (auth.ready && !auth.signedIn) {
    return (
      <EmptyPanel
        title="Reset link required"
        body="Open the password reset link from your email on this device, then choose a new password."
        actionHref="/sign-in"
        actionLabel="Sign in"
        className="mt-0 py-10"
        headingLevel={1}
      />
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
    toast.success("Password updated")
    router.replace("/account")
  }

  return (
    <div className="mx-auto w-full max-w-md space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Choose a new password</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          You can also keep using an email code to sign in.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>New password</CardTitle>
          <CardDescription>At least 8 characters. A mix of letters and numbers is stronger.</CardDescription>
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
              label="Password"
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
            <FormField label="Confirm password" htmlFor="reset-password-confirm" required>
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
              {busy ? "Saving…" : "Update password"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
