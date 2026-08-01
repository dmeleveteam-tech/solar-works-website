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
  | "insights"
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
            {/* Keyboard users otherwise tab the entire sidebar before reaching
                the table they came for. */}
            <a
              href="#main"
              className="sr-only z-50 focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
            >
              Skip to content
            </a>

            <header className="sticky top-0 z-10 flex h-14 shrink-0 items-center gap-2 rounded-t-xl border-b border-border/70 bg-background/80 px-4 backdrop-blur-md supports-[backdrop-filter]:bg-background/65">
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

            {/* The content column is capped rather than edge-to-edge: a lead row
                stretched across an ultrawide monitor puts the name and the
                status control a foot apart. */}
            <main
              id="main"
              className="flex flex-1 flex-col px-4 pt-6 pb-16 md:px-8 md:pt-8"
            >
              <div className="mx-auto w-full max-w-[88rem]">{children}</div>
            </main>
          </SidebarInset>
        </SidebarProvider>
      </NotificationsProvider>
    </TooltipProvider>
  )
}

/**
 * Standard page header. `actions` is optional so the existing
 * `<PageHeading title description />` call sites keep working unchanged.
 */
export function PageHeading({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        {eyebrow ? <p className="section-label mb-2.5">{eyebrow}</p> : null}
        {/* Tighter tracking and a heavier weight than the body scale, so the
            title reads as a landmark rather than as slightly-larger text. */}
        <h1 className="text-display text-[1.75rem] leading-[1.1] md:text-[2rem]">
          {title}
        </h1>
        {description ? (
          /* ~65 characters — past that the eye loses the line on return. */
          <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-pretty text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  )
}

/** Groups related blocks inside a page, one step below `PageHeading`. */
export function SectionHeading({
  title,
  description,
  actions,
}: {
  title: string
  description?: string
  actions?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h2 className="font-heading text-base font-semibold tracking-[-0.01em]">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 max-w-[62ch] text-sm text-pretty text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </div>
  )
}
