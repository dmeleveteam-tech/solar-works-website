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
