import { requireRole } from "@/lib/session"
import { AppShell } from "@/components/app-shell"
import type { Role } from "@/lib/permissions"
import { navForRole } from "@/lib/nav"

export default async function CmsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await requireRole("content_editor", "superadmin")
  const role = session.user.role as Role
  return (
    <AppShell
      user={{
        name: session.user.name,
        email: session.user.email,
        role,
      }}
      nav={navForRole(role)}
    >
      {children}
    </AppShell>
  )
}
