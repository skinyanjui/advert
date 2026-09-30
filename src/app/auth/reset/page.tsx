import type { Metadata } from "next"
import { Suspense } from "react"

import { ResetPasswordForm } from "@/components/reset-password-form"

export const metadata: Metadata = {
  title: "Reset password",
}

export default function ResetPasswordPage() {
  return (
    <div className="w-full px-3 py-8 md:px-4">
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading…</p>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  )
}
