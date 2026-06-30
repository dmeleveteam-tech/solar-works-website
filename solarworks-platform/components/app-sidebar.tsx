"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  FileText,
  Inbox,
  LayoutDashboard,
  Loader2,
  LogOut,
  Sun,
  Users,
  type LucideIcon,
} from "lucide-react"

import { authClient } from "@/lib/auth-client"
import { activeNavItem } from "@/lib/active-nav"
import { ROLE_LABEL } from "@/components/role-badge"
import { Brand } from "@/components/brand"
import type { NavIconName, NavItem, ShellUser } from "@/components/app-shell"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

const NAV_ICONS: Record<NavIconName, LucideIcon> = {
  overview: LayoutDashboard,
  leads: Inbox,
  users: Users,
  content: FileText,
  portal: LayoutDashboard,
}

export function AppSidebar({ user, nav }: { user: ShellUser; nav: NavItem[] }) {
  const pathname = usePathname()
  const active = activeNavItem(pathname, nav)

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/">
                <span className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary/15 text-primary-strong">
                  <Sun className="size-4" />
                </span>
                <span className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                  <Brand />
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {nav.map((item) => {
                const Icon = item.icon ? NAV_ICONS[item.icon] : LayoutDashboard
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={item.href === active?.href}
                      tooltip={item.label}
                    >
                      <Link href={item.href}>
                        <Icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="cursor-default hover:bg-transparent">
              <span className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground">
                {initials(user)}
              </span>
              <span className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-medium">
                  {user.name || user.email}
                </span>
                <span className="truncate text-xs text-muted-foreground">
                  {ROLE_LABEL[user.role]}
                </span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SignOutMenuItem />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}

function SignOutMenuItem() {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)

  async function onSignOut() {
    setPending(true)
    await authClient.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <SidebarMenuButton onClick={onSignOut} disabled={pending} tooltip="Sign out">
      {pending ? <Loader2 className="animate-spin" /> : <LogOut />}
      <span>Sign out</span>
    </SidebarMenuButton>
  )
}

/** Up to two initials from the user's name, falling back to the email. */
function initials(user: ShellUser): string {
  const source = user.name?.trim() || user.email
  const parts = source.split(/\s+/).filter(Boolean)
  const letters =
    parts.length > 1
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`
      : source.slice(0, 2)
  return letters.toUpperCase()
}
