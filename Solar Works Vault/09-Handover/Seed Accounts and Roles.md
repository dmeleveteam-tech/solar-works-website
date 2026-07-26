---
title: Seed Accounts and Roles
type: handover
tags: [solar-works, platform, auth, roles, seed, local-dev]
created: 2026-07-25
status: current
---

# Seed Accounts and Roles

The demo accounts created by `pnpm seed:roles` — one per role — for local
development and QA of `solarworks-platform`.

> [!danger] Local development only
> Every account below shares one hard-coded password (`scripts/seed-roles.ts:19`,
> already committed to this repo). These accounts must **never** exist on the
> production deployment. Before go-live: run the seed only against the local /
> staging database, and create the real superadmin with `pnpm seed:superadmin`
> using a password that is not written down anywhere in git.

## The four accounts

All use the password **`solarworks0123`**.

| Email | Name | Role | Lands on |
| --- | --- | --- | --- |
| `superadmin@solarworks.ph` | Super Admin | `superadmin` | `/admin` |
| `staff@solarworks.ph` | Staff Demo | `staff` | `/dashboard` |
| `editor@solarworks.ph` | Content Editor Demo | `content_editor` | `/cms` |
| `customer@solarworks.ph` | Customer Demo | `customer` | `/portal` |

Login is at **http://localhost:3001/login** (the platform runs on port 3001;
the marketing site takes 3000). Post-login redirects come from
`ROLE_LANDING` in `lib/permissions.ts`.

`superadmin` is the only entry in `ADMIN_ROLES` — it alone gets better-auth's
user/session management. `customer` is `DEFAULT_ROLE`, so anyone who
self-registers lands there with read-only access to their own projects.

## Re-seeding

From `solarworks-platform`:

```
pnpm seed:roles
```

Idempotent and safe to re-run. An account that already exists is left alone but
**re-promoted to its intended role** — which makes this the quickest way to undo
a role you changed by hand while testing. It never resets passwords.

Requires `MONGODB_URI` and `BETTER_AUTH_SECRET` in `.env`. On this machine it
also needs `MONGODB_DNS_SERVERS` (see [[Chatbot RAG and n8n — Progress and Resume]]),
which the script picks up via its `../lib/dns-fix` import.

## Creating a real superadmin

`seed-superadmin.ts` takes credentials as arguments instead of hard-coding them —
this is the one to use for staging and production:

```
pnpm seed:superadmin <email> <password> "Full Name"
```

Or set `SUPERADMIN_EMAIL` / `SUPERADMIN_PASSWORD` / `SUPERADMIN_NAME` in `.env`.
Minimum password length is 8. If the email already exists, the account is left
in place and simply promoted to `superadmin`, so it doubles as a
"promote this person" tool.

## Related

- [[Admin Handover and Go-Live Guide]]
- [[Chatbot RAG and n8n — Progress and Resume]]
- [[Platform Deployment Goal Prompt]]
