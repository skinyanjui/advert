export const PASSWORD_MIN_LENGTH = 8

export type PasswordStrength = "too-short" | "weak" | "ok" | "strong"

export function passwordError(password: string): string | undefined {
  if (!password) return "Enter a password."
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Use at least ${PASSWORD_MIN_LENGTH} characters.`
  }
  return undefined
}

export function passwordStrength(password: string): PasswordStrength {
  if (password.length < PASSWORD_MIN_LENGTH) return "too-short"

  let score = 0
  if (password.length >= 12) score += 1
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1

  if (score <= 1) return "weak"
  if (score === 2) return "ok"
  return "strong"
}

export function passwordStrengthLabel(strength: PasswordStrength): string {
  switch (strength) {
    case "too-short":
      return `At least ${PASSWORD_MIN_LENGTH} characters`
    case "weak":
      return "Weak — add letters and numbers"
    case "ok":
      return "Good"
    case "strong":
      return "Strong"
    default: {
      const _exhaustive: never = strength
      return _exhaustive
    }
  }
}

export function passwordsMatchError(password: string, confirm: string): string | undefined {
  if (!confirm) return "Confirm your password."
  if (password !== confirm) return "Passwords do not match."
  return undefined
}
