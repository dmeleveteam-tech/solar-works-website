import { requireRole } from "@/lib/session"
import { AppShell, type NavItem } from "@/components/app-shell"
import type { Role } from "@/lib/permissions"

const NAV: NavItem[] = [{ label: "Content", href: "/cms", icon: "content" }]

export default async function CmsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await requireRole("content_editor", "superadmin")
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
