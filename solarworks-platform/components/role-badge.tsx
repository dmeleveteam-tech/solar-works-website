import type { ComponentProps } from "react"

import { Badge } from "@/components/ui/badge"
import type { Role } from "@/lib/permissions"

const ROLE_LABEL: Record<Role, string> = {
  superadmin: "Super Admin",
  staff: "Staff",
  content_editor: "Content Editor",
  customer: "Customer",
}

/**
 * Roles read as a hierarchy, so the tones step down in weight rather than
 * picking four unrelated hues: brand for the one role that can change other
 * roles, info for staff, and a receding outline/neutral pair for the two that
 * only touch their own area.
 */
const ROLE_TONE: Record<Role, ComponentProps<typeof Badge>["tone"]> = {
  superadmin: "brand",
  staff: "info",
  content_editor: "outline",
  customer: "neutral",
}

export function RoleBadge({ role, className }: { role: Role; className?: string }) {
  return (
    <Badge tone={ROLE_TONE[role]} shape="pill" size="sm" className={className}>
      {ROLE_LABEL[role]}
    </Badge>
  )
}

export { ROLE_LABEL }
