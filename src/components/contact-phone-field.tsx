"use client"

import { FormField } from "@/components/form-field"
import { Input } from "@/components/ui/input"
import { contactPhonePlaceholder } from "@/lib/contact-phone"
import { getCountry } from "@/lib/countries"

/**
 * Call / WhatsApp phone input shared by post-an-ad and Profile buyer contact.
 * Dialing hint comes from the given country code when known; no KE default.
 */
export function ContactPhoneField({
  value,
  onChange,
  countryCode,
  error,
  required = false,
  id = "contact-phone",
  hint,
  className,
}: {
  value: string
  onChange: (value: string) => void
  countryCode?: string | null
  error?: string
  required?: boolean
  id?: string
  hint?: string
  className?: string
}) {
  const callingCode = countryCode ? getCountry(countryCode)?.callingCode : undefined
  return (
    <FormField id={id} label="Phone" required={required} error={error} hint={hint}>
      {(control) => (
        <Input
          id={control.id}
          value={value}
          inputMode="tel"
          autoComplete="tel"
          aria-invalid={control.invalid || undefined}
          aria-describedby={control.describedBy}
          aria-errormessage={control.errorId}
          onChange={(event) => onChange(event.target.value)}
          placeholder={contactPhonePlaceholder(callingCode)}
          className={className ?? "h-11 bg-white sm:h-10"}
        />
      )}
    </FormField>
  )
}
