import type { ReactNode } from "react"

import { Label } from "@/components/ui/label"

/** Shared label / error / hint wrapper used by post-an-ad and Profile forms. */
export function FormField({
  label,
  error,
  required,
  hint,
  htmlFor,
  children,
}: {
  label: string
  error?: string
  required?: boolean
  hint?: string
  htmlFor?: string
  children: ReactNode
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor}>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
      {error ? (
        <span data-field-error className="text-xs text-destructive">
          {error}
        </span>
      ) : hint ? (
        <span className="text-xs text-muted-foreground">{hint}</span>
      ) : null}
    </div>
  )
}
