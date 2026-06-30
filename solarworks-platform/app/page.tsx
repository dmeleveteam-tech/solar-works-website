import { redirect } from "next/navigation"

import { getSession } from "@/lib/session"
import { ROLE_HOME, isRole } from "@/lib/permissions"

// Entry point: route every visitor to the right place for their role.
export default async function Home() {
  const session = await getSession()
  if (!session) redirect("/login")
  const role = session.user.role
  redirect(isRole(role) ? ROLE_HOME[role] : "/login")
}
