import { cn } from "@/lib/utils"
import type { Role } from "@/lib/permissions"

const ROLE_LABEL: Record<Role, string> = {
  superadmin: "Super Admin",
  staff: "Staff",
  content_editor: "Content Editor",
  customer: "Customer",
}

const ROLE_CLASS: Record<Role, string> = {
  superadmin: "bg-primary/15 text-primary-strong",
  staff: "bg-sky-500/15 text-sky-700",
  content_editor: "bg-violet-500/15 text-violet-700",
  customer: "bg-muted text-muted-foreground",
}

export function RoleBadge({ role, className }: { role: Role; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        ROLE_CLASS[role],
        className,
      )}
    >
      {ROLE_LABEL[role]}
    </span>
  )
}

export { ROLE_LABEL }
