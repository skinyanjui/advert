"use client"

import { useId, type ReactNode } from "react"

import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

export type FormFieldControl = {
  id: string
  labelId: string
  describedBy?: string
  errorId?: string
  invalid: boolean
}

/**
 * Shared accessible label / description / error wrapper.
 * Use the render-prop form when the wrapper owns the control ID and ARIA links.
 */
export function FormField({
  label,
  error,
  required,
  hint,
  htmlFor,
  id,
  group = false,
  children,
  className,
}: {
  label: string
  error?: string
  required?: boolean
  hint?: string
  htmlFor?: string
  id?: string
  group?: boolean
  children: ReactNode | ((control: FormFieldControl) => ReactNode)
  className?: string
}) {
  const generated = useId().replace(/:/g, "")
  const controlId = id ?? htmlFor ?? `field-${generated}`
  const labelId = `${controlId}-label`
  const hintId = hint ? `${controlId}-hint` : undefined
  const errorId = error ? `${controlId}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(" ") || undefined
  const control: FormFieldControl = {
    id: controlId,
    labelId,
    describedBy,
    errorId,
    invalid: Boolean(error),
  }
  const body = typeof children === "function" ? children(control) : children
  const labelContent = (
    <>
      {label}
      {required ? (
        <>
          <span aria-hidden="true" className="text-destructive"> *</span>
          <span className="sr-only"> required</span>
        </>
      ) : null}
    </>
  )

  if (group) {
    return (
      <fieldset
        className={cn("grid min-w-0 gap-1.5", className)}
        aria-describedby={describedBy}
        aria-invalid={error ? true : undefined}
      >
        <legend id={labelId} className="text-sm font-medium leading-none">
          {labelContent}
        </legend>
        {body}
        {hint ? <span id={hintId} className="text-xs text-muted-foreground">{hint}</span> : null}
        {error ? (
          <span id={errorId} role="alert" data-field-error className="text-xs text-destructive">
            {error}
          </span>
        ) : null}
      </fieldset>
    )
  }

  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label id={labelId} htmlFor={controlId}>{labelContent}</Label>
      {body}
      {hint ? <span id={hintId} className="text-xs text-muted-foreground">{hint}</span> : null}
      {error ? (
        <span id={errorId} role="alert" data-field-error className="text-xs text-destructive">
          {error}
        </span>
      ) : null}
    </div>
  )
}
