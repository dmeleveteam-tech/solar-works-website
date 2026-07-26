import type { NavItem } from "@/components/app-shell"

/**
 * The nav item that best matches the current path. Longest matching href wins,
 * so `/admin/users` highlights "Users" rather than the `/admin` "Overview".
 */
export function activeNavItem(
  pathname: string,
  nav: NavItem[],
): NavItem | undefined {
  return nav
    .filter((i) => pathname === i.href || pathname.startsWith(`${i.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]
}

/**
 * Unread notifications bucketed to the nav item each one points at, so the
 * sidebar can show a red dot next to the section that needs attention. Reuses
 * `activeNavItem`'s longest-match rule, so a `/dashboard/projects` notification
 * counts against "Customer projects" and not the `/dashboard` "Leads" entry.
 *
 * Notifications with no href, or whose href falls outside this role's nav, are
 * skipped — they still show in the bell, which is the complete list.
 */
export function unreadByNavHref(
  items: ReadonlyArray<{ href: string | null; read: boolean }>,
  nav: NavItem[],
): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const item of items) {
    if (item.read || !item.href) continue
    const match = activeNavItem(item.href, nav)
    if (!match) continue
    counts[match.href] = (counts[match.href] ?? 0) + 1
  }
  return counts
}
