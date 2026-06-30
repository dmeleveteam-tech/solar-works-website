import { requireRole } from "@/lib/session"
import { AppShell, type NavItem } from "@/components/app-shell"
import type { Role } from "@/lib/permissions"

const NAV: NavItem[] = [{ label: "Leads", href: "/dashboard" }]

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await requireRole("staff", "superadmin")
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
