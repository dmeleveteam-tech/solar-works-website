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

  // baseURL only trusts its own origin. Vercel preview/branch deployments
  // (e.g. solar-works-admin-git-main-dm-eleve.vercel.app) get a different
  // origin per deploy, so widen trust to this project's Vercel URL shape.
  trustedOrigins: ["https://solar-works-admin-*.vercel.app"],

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
