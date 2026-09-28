import type { Metadata } from "next"
import { Suspense } from "react"

import { LoadingText } from "@/components/loading-text"
import { ResetPasswordForm } from "@/components/reset-password-form"

export const metadata: Metadata = {
  title: "Reset password",
}

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-6">
      <Suspense fallback={<LoadingText messageKey="common.loading" className="text-muted-foreground" />}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  )
}
