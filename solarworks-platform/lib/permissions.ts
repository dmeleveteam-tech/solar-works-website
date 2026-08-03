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
  // Customer projects: staff/admin manage contact records and stage tracking
  // directly. There is no customer-facing login — customers are contacted by
  // email/phone, never a portal.
  project: ["read", "manage", "delete"],
  // Solar Savings Tracker: staff/admin manage tariffs, plant links, and
  // uploads; deletion is admin-only.
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

export const roles = {
  superadmin,
  staff,
  content_editor: contentEditor,
}

export const ROLES = ["superadmin", "staff", "content_editor"] as const
export type Role = (typeof ROLES)[number]

/** Roles the admin plugin treats as administrators (can manage other users). */
export const ADMIN_ROLES = ["superadmin"] as const
/**
 * better-auth's admin plugin requires a default role even though it's
 * unreachable here: there's no self-service sign-up (`emailAndPassword.
 * disableSignUp` in `lib/auth.ts`, and no /signup route), so no account is
 * ever created without a superadmin explicitly picking a role in the Users
 * admin page.
 */
export const DEFAULT_ROLE: Role = "staff"

/** Where each role lands after signing in. */
export const ROLE_HOME: Record<Role, string> = {
  superadmin: "/admin",
  staff: "/dashboard",
  content_editor: "/cms",
}

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ROLES as readonly string[]).includes(value)
}
