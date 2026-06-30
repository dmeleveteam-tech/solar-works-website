import Link from "next/link"

import { Brand } from "@/components/brand"
import { RoleBadge } from "@/components/role-badge"
import { SignOutButton } from "@/components/sign-out-button"
import type { Role } from "@/lib/permissions"

export type NavItem = { label: string; href: string }

export function AppShell({
  user,
  nav,
  children,
}: {
  user: { name?: string | null; email: string; role: Role }
  nav: NavItem[]
  children: React.ReactNode
}) {
  return (
    <div className="min-h-svh">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
          <Link href="/" className="shrink-0">
            <Brand />
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="text-sm leading-tight font-medium">
                {user.name || user.email}
              </div>
              <div className="text-xs leading-tight text-muted-foreground">
                {user.email}
              </div>
            </div>
            <RoleBadge role={user.role} />
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
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
