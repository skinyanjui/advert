import type { Metadata } from "next"
import { Suspense } from "react"

import { SignInForm } from "@/components/sign-in-form"

export const metadata: Metadata = {
  title: "Sign in",
}

export default function SignInPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 md:px-6">
      <Suspense fallback={<p className="text-sm text-muted-foreground">Loading sign-in…</p>}>
        <SignInForm />
      </Suspense>
    </div>
  )
}
