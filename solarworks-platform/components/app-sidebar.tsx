"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  FileText,
  FolderKanban,
  Inbox,
  LayoutDashboard,
  Loader2,
  LogOut,
  PiggyBank,
  Users,
  type LucideIcon,
} from "lucide-react"

import { authClient } from "@/lib/auth-client"
import { activeNavItem, unreadByNavHref } from "@/lib/active-nav"
import { ROLE_HOME } from "@/lib/permissions"
import { ROLE_LABEL } from "@/components/role-badge"
import { Brand, BrandMark } from "@/components/brand"
import { useNotifications } from "@/components/notifications/notifications-provider"
import { UnreadBadge } from "@/components/notifications/unread-badge"
import type { NavIconName, NavItem, ShellUser } from "@/components/app-shell"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"

const NAV_ICONS: Record<NavIconName, LucideIcon> = {
  overview: LayoutDashboard,
  leads: Inbox,
  users: Users,
  content: FileText,
  projects: FolderKanban,
  savings: PiggyBank,
}

export function AppSidebar({ user, nav }: { user: ShellUser; nav: NavItem[] }) {
  const pathname = usePathname()
  const active = activeNavItem(pathname, nav)
  const { items } = useNotifications()
  // Unread notifications bucketed to the section they point at, so a red dot
  // tells you *where* the work is before you open the bell.
  const unread = React.useMemo(() => unreadByNavHref(items, nav), [items, nav])

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="bg-gradient-to-b from-primary/12 to-transparent">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href={ROLE_HOME[user.role]}>
                {/* mark stays visible on the collapsed icon rail */}
                <BrandMark />
                <span className="grid flex-1 text-left leading-tight group-data-[collapsible=icon]:hidden">
                  <Brand showMark={false} />
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
                const count = unread[item.href] ?? 0
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={item.href === active?.href}
                      className="data-active:!bg-primary/15 data-active:!text-primary-strong data-active:[&_svg]:text-primary-strong"
                      tooltip={
                        count > 0 ? `${item.label} — ${count} unread` : item.label
                      }
                    >
                      <Link href={item.href}>
                        <Icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>

                    {count > 0 ? (
                      <>
                        <SidebarMenuBadge className="p-0">
                          <UnreadBadge count={count} />
                          <span className="sr-only">{count} unread</span>
                        </SidebarMenuBadge>
                        {/* The collapsed icon rail hides label and badge alike,
                            so mark the icon itself with a bare dot. */}
                        <span
                          aria-hidden
                          className="pointer-events-none absolute top-1 right-1 hidden size-2 rounded-full bg-destructive ring-2 ring-sidebar group-data-[collapsible=icon]:block"
                        />
                      </>
                    ) : null}
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
              <span className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary-strong text-xs font-semibold text-primary-foreground">
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
