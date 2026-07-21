# Solar Works Platform

The authenticated application for Solar Works — separate from the public marketing
site in [`../solarworks-landingpage`](../solarworks-landingpage). Houses the staff **lead dashboard**, the
**customer portal**, the **content (CMS)** area, and **superadmin** user
management.

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Auth:** [better-auth](https://better-auth.com) — email/password + Google,
  with the `admin` plugin for user management
- **Database:** MongoDB (Atlas)
- **UI:** shadcn/ui + Tailwind v4, sharing the marketing site's design tokens

## Roles

| Role             | Lands on     | Can…                                              |
| ---------------- | ------------ | ------------------------------------------------- |
| `superadmin`     | `/admin`     | manage all users + reach every area               |
| `staff`          | `/dashboard` | view & manage leads                               |
| `content_editor` | `/cms`       | edit site content                                 |
| `customer`       | `/portal`    | track their own assessment / quotes / install     |

Public sign-ups are always `customer`. Staff, editors, and other admins are
created by a superadmin (or the seed script).

## Setup

```bash
pnpm install
cp .env.example .env   # then fill in real values
```

Required env (see `.env.example`):

- `MONGODB_URI` — MongoDB Atlas connection string
- `MONGODB_DB` — database name (default `solarworks`)
- `BETTER_AUTH_SECRET` — 32-byte random secret
- `BETTER_AUTH_URL` — app base URL (default `http://localhost:3001`)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — optional, enables Google sign-in.
  Redirect URI: `${BETTER_AUTH_URL}/api/auth/callback/google`
- `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` — optional, enables
  CMS image/video/document uploads (get these from your [Cloudinary](https://cloudinary.com)
  dashboard). Without them the CMS upload fields error on upload.
- `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` / `NEXT_PUBLIC_CLOUDINARY_API_KEY` — same values as
  `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY`, exposed to the browser so the upload widget
  can build signed requests (not secrets — the actual signing key, `CLOUDINARY_API_SECRET`,
  stays server-only).

## Create the first superadmin

```bash
pnpm seed:superadmin you@example.com "your-password" "Your Name"
```

(Once one superadmin exists, create everyone else from `/admin/users`.)

## Develop

```bash
pnpm dev          # http://localhost:3001
pnpm typecheck
pnpm build
```

## Architecture notes

- **Auth boundary is two-layer.** `proxy.ts` (Next 16 proxy/middleware) does a
  fast edge presence check on protected prefixes; the real role authorization
  runs in each area's server-component layout via `requireRole` (`lib/session.ts`),
  which can read the DB.
- **Secrets never reach the browser.** `lib/env.ts` and `lib/mongodb.ts` are
  marked `server-only`; auth config lives in `lib/auth.ts`.
- **Roles & permissions** are defined once in `lib/permissions.ts` and shared by
  the server (`lib/auth.ts`) and client (`lib/auth-client.ts`).
