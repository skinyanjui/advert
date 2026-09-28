export const site = {
  name: "africa classifieds",
  tagline: "Buy and sell across Africa. Cars, houses, jobs, electronics, and everything in between.",
  supportEmail: undefined as string | undefined,
  foundedYear: 2024,
} as const

export function siteTitle(page?: string): string {
  return page ? `${page} · ${site.name}` : site.name
}

export function siteTitleTemplate(): string {
  return `%s · ${site.name}`
}

export function siteHomeLabel(): string {
  return `${site.name} home`
}

export function siteEmailFrom(fallback = "onboarding@resend.dev"): string {
  return `${site.name} <${fallback}>`
}
