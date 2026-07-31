import { AppSidebar } from "@/components/app-sidebar"
import { ActiveCrumb } from "@/components/active-crumb"
import { NotificationBell } from "@/components/notifications/notification-bell"
import { NotificationsProvider } from "@/components/notifications/notifications-provider"
import { Separator } from "@/components/ui/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import type { Role } from "@/lib/permissions"

/**
 * Icon keys are strings (not component references) so a NavItem stays
 * serializable across the Server → Client boundary. `AppSidebar` maps each key
 * to a lucide icon.
 */
export type NavIconName =
  | "overview"
  | "leads"
  | "users"
  | "content"
  | "portal"
  | "projects"
  | "savings"

export type NavItem = { label: string; href: string; icon?: NavIconName }

export type ShellUser = { name?: string | null; email: string; role: Role }

export function AppShell({
  user,
  nav,
  children,
}: {
  user: ShellUser
  nav: NavItem[]
  children: React.ReactNode
}) {
  return (
    <TooltipProvider>
      {/* Wraps sidebar and header together so the nav dots and the bell badge
          come from one poll of the feed instead of two. */}
      <NotificationsProvider>
        <SidebarProvider>
          <AppSidebar user={user} nav={nav} />
          <SidebarInset>
            <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 rounded-t-xl border-b border-primary/15 bg-gradient-to-r from-primary/10 via-background/90 to-background/90 px-4 backdrop-blur">
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mr-1 data-[orientation=vertical]:h-4"
              />
              <ActiveCrumb nav={nav} />
              <div className="ml-auto flex items-center gap-1">
                <NotificationBell />
              </div>
            </header>
            <div className="flex flex-1 flex-col p-4 md:p-6">{children}</div>
          </SidebarInset>
        </SidebarProvider>
      </NotificationsProvider>
    </TooltipProvider>
  )
}

/** Standard page header used inside dashboard pages. */
export function PageHeading({
  title,
  description,
}: {
  title: string
  description?: string
}) {
  return (
    <div className="mb-6">
      <h1 className="font-heading text-2xl font-bold tracking-tight">{title}</h1>
      {description ? (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      ) : null}
    </div>
  )
}
