/**
 * Seed the first superadmin.
 *
 *   pnpm seed:superadmin <email> <password> ["Full Name"]
 *
 * or set SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD / SUPERADMIN_NAME in .env.
 *
 * This builds a standalone better-auth instance (so it doesn't import the
 * `server-only`-guarded app modules) to create the account with a properly
 * hashed password, then promotes that user's role to `superadmin` directly.
 */
import "dotenv/config"
import "../lib/dns-fix"
import { MongoClient } from "mongodb"
import { betterAuth } from "better-auth"
import { mongodbAdapter } from "better-auth/adapters/mongodb"
import { admin } from "better-auth/plugins"

import { ac, roles, ADMIN_ROLES, DEFAULT_ROLE } from "../lib/permissions"

async function main() {
  const email = process.argv[2] ?? process.env.SUPERADMIN_EMAIL
  const password = process.argv[3] ?? process.env.SUPERADMIN_PASSWORD
  const name = process.argv[4] ?? process.env.SUPERADMIN_NAME ?? "Super Admin"

  if (!email || !password) {
    console.error(
      'Usage: pnpm seed:superadmin <email> <password> ["Full Name"]\n' +
        "   (or set SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD in .env)",
    )
    process.exit(1)
  }
  if (password.length < 8) {
    console.error("Password must be at least 8 characters.")
    process.exit(1)
  }

  const uri = process.env.MONGODB_URI
  if (!uri) {
    console.error("MONGODB_URI is not set.")
    process.exit(1)
  }
  const dbName = process.env.MONGODB_DB ?? "solarworks"

  const client = new MongoClient(uri)
  await client.connect()
  const db = client.db(dbName)

  const auth = betterAuth({
    appName: "Solar Works Platform",
    baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3001",
    secret: process.env.BETTER_AUTH_SECRET,
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

  const existing = await db.collection("user").findOne({ email })
  if (existing) {
    await db
      .collection("user")
      .updateOne({ email }, { $set: { role: "superadmin" } })
    console.log(`✓ ${email} already existed — promoted to superadmin.`)
  } else {
    await auth.api.signUpEmail({ body: { email, password, name } })
    await db
      .collection("user")
      .updateOne({ email }, { $set: { role: "superadmin" } })
    console.log(`✓ Created superadmin ${email}.`)
  }

  await client.close()
  process.exit(0)
}

main().catch((err) => {
  console.error("Seed failed:", err)
  process.exit(1)
})
