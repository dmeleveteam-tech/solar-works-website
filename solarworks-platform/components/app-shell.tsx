import { AppSidebar } from "@/components/app-sidebar"
import { ActiveCrumb } from "@/components/active-crumb"
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
      <SidebarProvider>
        <AppSidebar user={user} nav={nav} />
        <SidebarInset>
          <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 rounded-t-xl border-b bg-background/80 px-4 backdrop-blur">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-1 data-[orientation=vertical]:h-4"
            />
            <ActiveCrumb nav={nav} />
          </header>
          <div className="flex flex-1 flex-col p-4 md:p-6">{children}</div>
        </SidebarInset>
      </SidebarProvider>
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
