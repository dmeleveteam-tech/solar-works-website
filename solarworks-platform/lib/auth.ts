import "server-only"
import { betterAuth } from "better-auth"
import { mongodbAdapter } from "better-auth/adapters/mongodb"
import { admin } from "better-auth/plugins"
import { nextCookies } from "better-auth/next-js"

import { db } from "./mongodb"
import { env, googleEnabled } from "./env"
import { ac, roles, ADMIN_ROLES, DEFAULT_ROLE } from "./permissions"

export const auth = betterAuth({
  appName: "Solar Works Platform",
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: mongodbAdapter(db),

  /**
   * Origins allowed to POST to /api/auth.
   *
   * MUST include the baseURL's own origin explicitly. Supplying this option
   * REPLACES better-auth's default (which is the baseURL origin) rather than
   * adding to it — so listing only the wildcard silently un-trusts the canonical
   * domain. That is not theoretical: `solar-works-admin-*.vercel.app` requires a
   * hyphen and a suffix, so it never matched `solar-works-admin.vercel.app`, and
   * every production sign-in failed with 403 INVALID_ORIGIN while preview
   * deployments worked fine.
   *
   * Derived from BETTER_AUTH_URL rather than hardcoded, so pointing the app at a
   * custom domain cannot reintroduce the same bug. The wildcard stays for Vercel
   * preview/branch deploys, which get a fresh origin each time.
   */
  trustedOrigins: [new URL(env.BETTER_AUTH_URL).origin, "https://solar-works-admin-*.vercel.app"],

  emailAndPassword: {
    enabled: true,
    // Email verification can be turned on once Resend is wired (Phase 4).
    requireEmailVerification: false,
    minPasswordLength: 8,
  },

  socialProviders: googleEnabled
    ? {
        google: {
          clientId: env.GOOGLE_CLIENT_ID!,
          clientSecret: env.GOOGLE_CLIENT_SECRET!,
        },
      }
    : undefined,

  session: {
    // Sign session data into a short-lived cookie so middleware/layouts can read
    // the role without a DB round-trip on every request.
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },

  plugins: [
    admin({
      ac,
      roles,
      defaultRole: DEFAULT_ROLE,
      adminRoles: [...ADMIN_ROLES],
    }),
    // Must be the LAST plugin so Set-Cookie works inside Server Actions.
    nextCookies(),
  ],
})

export type Session = typeof auth.$Infer.Session
