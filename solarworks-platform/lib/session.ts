import "server-only"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { auth } from "./auth"
import { ROLE_HOME, isRole, type Role } from "./permissions"

/** Read the current session (or null) from request headers. */
export async function getSession() {
  return auth.api.getSession({ headers: await headers() })
}

/** Require a signed-in user, else redirect to /login. */
export async function requireUser() {
  const session = await getSession()
  if (!session) redirect("/login")
  return session
}

/**
 * Require the signed-in user to hold one of `allowed` roles. Users with a valid
 * but unauthorized role are sent to their own home; unknown roles to /login.
 */
export async function requireRole(...allowed: Role[]) {
  const session = await requireUser()
  const role = session.user.role
  if (!isRole(role) || !allowed.includes(role)) {
    redirect(isRole(role) ? ROLE_HOME[role] : "/login")
  }
  return session
}
