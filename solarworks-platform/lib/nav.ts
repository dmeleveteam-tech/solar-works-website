import type { NavItem } from "@/components/app-shell"
import type { Role } from "@/lib/permissions"

/**
 * Sidebar navigation per role. This is the single source of truth so the nav
 * stays identical across every section a role can reach — e.g. a superadmin who
 * clicks "Leads" (which lives under the staff `/dashboard` layout) keeps seeing
 * the full admin nav instead of collapsing to just that section's links.
 */
const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  superadmin: [
    { label: "Overview", href: "/admin", icon: "overview" },
    { label: "Users", href: "/admin/users", icon: "users" },
    { label: "Leads", href: "/dashboard", icon: "leads" },
    { label: "Content", href: "/cms", icon: "content" },
  ],
  staff: [{ label: "Leads", href: "/dashboard", icon: "leads" }],
  content_editor: [{ label: "Content", href: "/cms", icon: "content" }],
  customer: [{ label: "Overview", href: "/portal", icon: "portal" }],
}

export function navForRole(role: Role): NavItem[] {
  return NAV_BY_ROLE[role] ?? []
}
