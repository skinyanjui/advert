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
  /** ISO country used only for the calling-code placeholder. */
  countryCode?: string | null
  error?: string
  required?: boolean
  id?: string
  hint?: string
  className?: string
}) {
  const callingCode = countryCode ? getCountry(countryCode)?.callingCode : undefined
  return (
    <FormField label="Phone" required={required} error={error} hint={hint} htmlFor={id}>
      <Input
        id={id}
        value={value}
        inputMode="tel"
        autoComplete="tel"
        aria-invalid={Boolean(error)}
        onChange={(event) => onChange(event.target.value)}
        placeholder={contactPhonePlaceholder(callingCode)}
        className={className ?? "h-11 bg-white sm:h-10"}
      />
    </FormField>
  )
}
