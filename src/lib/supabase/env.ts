export function publicSupabaseUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL
}

export function publicSupabaseKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_ANON_KEY
  )
}

/** Phone OTP UI is off until the owner attaches an SMS provider and sets this flag. */
export function phoneAuthEnabled(): boolean {
  return process.env.NEXT_PUBLIC_AUTH_PHONE === "1"
}
