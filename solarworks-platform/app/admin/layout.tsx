import { requireRole } from "@/lib/session"
import { AppShell, type NavItem } from "@/components/app-shell"
import type { Role } from "@/lib/permissions"

const NAV: NavItem[] = [
  { label: "Overview", href: "/admin", icon: "overview" },
  { label: "Users", href: "/admin/users", icon: "users" },
  { label: "Leads", href: "/dashboard", icon: "leads" },
  { label: "Content", href: "/cms", icon: "content" },
]

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await requireRole("superadmin")
  return (
    <AppShell
      user={{
        name: session.user.name,
        email: session.user.email,
        role: session.user.role as Role,
      }}
      nav={NAV}
    >
      {children}
    </AppShell>
  )
}
