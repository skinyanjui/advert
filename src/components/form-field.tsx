"use client"

import { useId, type ReactNode } from "react"

import { Label } from "@/components/ui/label"

export type FormFieldControlProps = {
  id: string
  "aria-describedby"?: string
  "aria-errormessage"?: string
  "aria-invalid"?: true
  "aria-required"?: true
}

/** Shared label / error / hint wrapper. Generates stable control and help IDs. */
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
  children: ReactNode | ((props: FormFieldControlProps) => ReactNode)
}) {
  const reactId = useId().replace(/:/g, "")
  const controlId = htmlFor ?? `field-${reactId}`
  const hintId = hint ? `${controlId}-hint` : undefined
  const errorId = error ? `${controlId}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined
  const controlProps: FormFieldControlProps = {
    id: controlId,
    ...(describedBy ? { "aria-describedby": describedBy } : {}),
    ...(errorId ? { "aria-errormessage": errorId, "aria-invalid": true as const } : {}),
    ...(required ? { "aria-required": true as const } : {}),
  }

  return (
    <div className="grid gap-1.5">
      <Label htmlFor={controlId}>
        {label}
        {required ? <span aria-hidden="true" className="text-destructive"> *</span> : null}
      </Label>
      {typeof children === "function" ? children(controlProps) : children}
      {hint ? (
        <span id={hintId} className="text-xs text-muted-foreground">
          {hint}
        </span>
      ) : null}
      {error ? (
        <span id={errorId} data-field-error role="alert" className="text-xs text-destructive">
          {error}
        </span>
      ) : null}
    </div>
  )
}
