import { NextResponse, type NextRequest } from "next/server"
import { getSessionCookie } from "better-auth/cookies"

/**
 * Edge guard (Next 16 "proxy" convention): redirects unauthenticated visitors
 * away from protected areas. This is an optimistic presence check only — it
 * confirms a session cookie exists, it does NOT verify the session or the
 * user's role. Role authorization is enforced per-area in the server-component
 * layouts via `requireRole`, which run in the Node runtime and read the
 * database. (better-auth recommends exactly this two-layer split.)
 */
const PROTECTED_PREFIXES = ["/admin", "/dashboard", "/portal", "/cms"]

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  )
  if (!isProtected) return NextResponse.next()

  const sessionCookie = getSessionCookie(request)
  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("redirectTo", pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*", "/portal/:path*", "/cms/:path*"],
}
