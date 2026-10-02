export const supportCategories = ["account", "moderation", "safety", "security", "legal", "general"] as const
export type SupportCategory = (typeof supportCategories)[number]
