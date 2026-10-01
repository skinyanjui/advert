import type { BoardOwner } from "@/lib/board-session"

export const appRoles = ["guest", "member", "admin"] as const
export type AppRole = (typeof appRoles)[number]

export const appPermissions = [
  "browse",
  "contact:direct",
  "message",
  "save",
  "report",
  "post",
  "profile",
  "moderation:review",
  "privacy:review",
  "compliance:manage",
  "admin:access",
] as const
export type AppPermission = (typeof appPermissions)[number]

const memberPermissions: readonly AppPermission[] = [
  "browse",
  "contact:direct",
  "message",
  "save",
  "report",
  "post",
  "profile",
]

const grants: Record<AppRole, ReadonlySet<AppPermission>> = {
  guest: new Set(["browse"]),
  member: new Set(memberPermissions),
  admin: new Set(appPermissions),
}

export function roleForOwner(owner: BoardOwner | undefined): AppRole {
  if (!owner || owner.kind !== "auth") return "guest"
  return owner.role === "admin" ? "admin" : "member"
}

export function can(role: AppRole, permission: AppPermission): boolean {
  return grants[role].has(permission)
}

export function canOwner(owner: BoardOwner | undefined, permission: AppPermission): boolean {
  return can(roleForOwner(owner), permission)
}
