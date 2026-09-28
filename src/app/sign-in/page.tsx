import type { Metadata } from "next"
import { Suspense } from "react"

import { LoadingText } from "@/components/loading-text"
import { SignInForm } from "@/components/sign-in-form"

export const metadata: Metadata = {
  title: "Sign in",
}

export default function SignInPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-6">
      <Suspense fallback={<LoadingText messageKey="auth.loadingSignIn" className="text-muted-foreground" />}>
        <SignInForm />
      </Suspense>
    </div>
  )
}
