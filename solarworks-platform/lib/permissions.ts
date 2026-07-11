import { createAccessControl } from "better-auth/plugins/access"
import { defaultStatements } from "better-auth/plugins/admin/access"

/**
 * Access-control statements for the Solar Works platform. We extend better-auth's
 * built-in admin statements (user / session management) with app-domain resources.
 * Roles below are shared by the server (`lib/auth.ts`) and the client
 * (`lib/auth-client.ts`) so permission checks stay in sync.
 */
export const statement = {
  ...defaultStatements,
  lead: ["create", "read", "update", "assign", "delete"],
  content: ["create", "read", "update", "publish", "delete"],
  // Customer-portal projects: staff/admin manage them; customers read only
  // their own (ownership is enforced by query scoping, not this statement).
  project: ["read", "manage", "delete"],
  // Solar Savings Tracker (Phase 2b): staff/admin manage tariffs, plant links,
  // and uploads; deletion is admin-only. Customers read only their own savings.
  savings: ["read", "manage", "delete"],
} as const

export const ac = createAccessControl(statement)

/** Full user/session admin permissions (mirrors better-auth's admin role). */
const fullUserAdmin = {
  user: [
    "create",
    "list",
    "set-role",
    "ban",
    "impersonate",
    "delete",
    "set-password",
    "set-email",
    "get",
    "update",
  ],
  session: ["list", "revoke", "delete"],
} as const

export const superadmin = ac.newRole({
  ...fullUserAdmin,
  lead: ["create", "read", "update", "assign", "delete"],
  content: ["create", "read", "update", "publish", "delete"],
  project: ["read", "manage", "delete"],
  savings: ["read", "manage", "delete"],
})

export const staff = ac.newRole({
  lead: ["create", "read", "update", "assign"],
  content: ["read"],
  project: ["read", "manage"],
  savings: ["read", "manage"],
})

export const contentEditor = ac.newRole({
  content: ["create", "read", "update", "publish", "delete"],
})

export const customer = ac.newRole({
  // Customers manage only their own portal data; no admin-plugin permissions.
})

export const roles = {
  superadmin,
  staff,
  content_editor: contentEditor,
  customer,
}

export const ROLES = ["superadmin", "staff", "content_editor", "customer"] as const
export type Role = (typeof ROLES)[number]

/** Roles the admin plugin treats as administrators (can manage other users). */
export const ADMIN_ROLES = ["superadmin"] as const
export const DEFAULT_ROLE: Role = "customer"

/** Where each role lands after signing in. */
export const ROLE_HOME: Record<Role, string> = {
  superadmin: "/admin",
  staff: "/dashboard",
  content_editor: "/cms",
  customer: "/portal",
}

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value)
}
