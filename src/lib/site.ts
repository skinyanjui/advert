export const site = {
  name: "africa classifieds",
  tagline: "Buy and sell across Africa. Cars, houses, jobs, electronics, and everything in between.",
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL?.trim() || undefined,
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

/** mailto: link when a public support address is configured; otherwise undefined. */
export function siteSupportMailto(): string | undefined {
  return site.supportEmail ? `mailto:${site.supportEmail}` : undefined
}

/** Shared placeholder for Terms/Privacy while no public support address is set. */
export const SUPPORT_CONTACT_PLACEHOLDER =
  "Contact: [support address to be added]. Until then, use Report on any listing."
