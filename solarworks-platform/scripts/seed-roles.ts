/**
 * Seed one demo account per role (for local development / testing).
 *
 *   pnpm seed:roles
 *
 * Reads MONGODB_URI / BETTER_AUTH_SECRET from .env. Existing accounts are left
 * in place but re-promoted to the intended role. All accounts share the same
 * dev password below — fine for local testing, never for production.
 */
import "dotenv/config"
import "../lib/dns-fix"
import { MongoClient } from "mongodb"
import { betterAuth } from "better-auth"
import { mongodbAdapter } from "better-auth/adapters/mongodb"
import { admin } from "better-auth/plugins"

import { ac, roles, ADMIN_ROLES, DEFAULT_ROLE, type Role } from "../lib/permissions"

const DEV_PASSWORD = "solarworks0123"

const ACCOUNTS: { email: string; name: string; role: Role }[] = [
  { email: "superadmin@solarworks.ph", name: "Super Admin", role: "superadmin" },
  { email: "staff@solarworks.ph", name: "Staff Demo", role: "staff" },
  { email: "editor@solarworks.ph", name: "Content Editor Demo", role: "content_editor" },
  { email: "customer@solarworks.ph", name: "Customer Demo", role: "customer" },
]

async function main() {
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
      admin({ ac, roles, defaultRole: DEFAULT_ROLE, adminRoles: [...ADMIN_ROLES] }),
    ],
  })

  for (const acct of ACCOUNTS) {
    const existing = await db.collection("user").findOne({ email: acct.email })
    if (existing) {
      await db
        .collection("user")
        .updateOne({ email: acct.email }, { $set: { role: acct.role } })
      console.log(`✓ ${acct.email} already existed — set role to ${acct.role}.`)
      continue
    }
    await auth.api.signUpEmail({
      body: { email: acct.email, password: DEV_PASSWORD, name: acct.name },
    })
    await db
      .collection("user")
      .updateOne({ email: acct.email }, { $set: { role: acct.role } })
    console.log(`✓ Created ${acct.role}: ${acct.email}`)
  }

  console.log(`\nAll accounts use password: ${DEV_PASSWORD}`)
  await client.close()
  process.exit(0)
}

main().catch((err) => {
  console.error("Seed failed:", err)
  process.exit(1)
})
