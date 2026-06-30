import "server-only"
import { betterAuth } from "better-auth"
import { mongodbAdapter } from "better-auth/adapters/mongodb"
import { admin } from "better-auth/plugins"

import { db } from "./mongodb"
import { env } from "./env"
import { ac, roles, ADMIN_ROLES, DEFAULT_ROLE } from "./permissions"

/**
 * Provisions customer accounts from the back-office WITHOUT signing the staff
 * member in. The main `auth` instance includes the `nextCookies` plugin, so
 * calling its sign-up from a Server Action would write the new user's session
 * cookie onto the staff member's response and log them out. This standalone
 * instance omits `nextCookies` (mirroring the seed scripts), so creating an
 * account has no effect on the caller's session.
 *
 * Authorization is the caller's responsibility: only the staff/superadmin-gated
 * projects actions use this.
 */
const provisioningAuth = betterAuth({
  appName: "Solar Works Platform",
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: mongodbAdapter(db),
  emailAndPassword: { enabled: true, minPasswordLength: 8 },
  plugins: [
    admin({
      ac,
      roles,
      defaultRole: DEFAULT_ROLE,
      adminRoles: [...ADMIN_ROLES],
    }),
  ],
})

export type CreateCustomerResult =
  | { ok: true; userId: string }
  | { ok: false; error: string }

/**
 * Create a new customer account (email + password) and force its role to
 * `customer`. Returns the new user id. Does not create or alter any session.
 */
export async function createCustomerAccount(input: {
  name: string
  email: string
  password: string
}): Promise<CreateCustomerResult> {
  const email = input.email.trim().toLowerCase()

  const existing = await db.collection("user").findOne({ email })
  if (existing) {
    return { ok: false, error: "An account with that email already exists." }
  }

  try {
    await provisioningAuth.api.signUpEmail({
      body: { email, password: input.password, name: input.name.trim() },
    })
  } catch {
    return { ok: false, error: "Could not create the customer account." }
  }

  const created = await db.collection("user").findOne({ email })
  if (!created) {
    return { ok: false, error: "Account creation did not complete." }
  }
  await db
    .collection("user")
    .updateOne({ email }, { $set: { role: "customer" } })

  return { ok: true, userId: String(created._id) }
}
