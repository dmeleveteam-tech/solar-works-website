import { requireRole } from "@/lib/session"
import { AppShell, type NavItem } from "@/components/app-shell"
import type { Role } from "@/lib/permissions"

const NAV: NavItem[] = [{ label: "Overview", href: "/portal", icon: "portal" }]

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await requireRole("customer", "superadmin")
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
