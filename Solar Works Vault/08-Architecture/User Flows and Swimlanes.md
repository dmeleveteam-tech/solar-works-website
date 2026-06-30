---
title: User Flows and Swimlanes
type: reference
tags: [solar-works, architecture, flows, swimlane, rbac]
source: "Code walkthrough 2026-06-30 (solarworks-landingpage + solarworks-platform)"
created: 2026-06-30
status: living
---

# User Flows and Swimlanes

> [!info] What this is
> A full-flow overview of how **every kind of user** moves through the two codebases — the public marketing site (`solarworks-landingpage/`) and the authenticated app (`solarworks-platform/`). Diagrams are Mermaid swimlanes (lanes = actors/systems). See [[Tech Stack and Architecture]] for the stack and [[Design System and Frontend Build]] for the UI layer.

## The cast (actors)

| Actor | Where they live | What they can do | Lands on |
|---|---|---|---|
| **Anonymous visitor** | Marketing site | Browse pages, read *published* content, submit the lead form | — |
| **Lead** | A MongoDB document, not a login | Created from the form; worked by staff. A lead is data, not a user account | — |
| **Customer** | Platform (`/portal`) | Track their own assessment / quotes / install (Phase 3 stub today) | `/portal` |
| **Staff** | Platform (`/dashboard`) | Read/create/update/**assign** leads; read-only on content | `/dashboard` |
| **Content editor** | Platform (`/cms`) | Full CRUD + publish on projects / testimonials / FAQs | `/cms` |
| **Superadmin** | Platform (everything) | All of the above **plus** user management and lead deletion | `/admin` |

Roles, permissions, and per-role home routes are the single source of truth in `solarworks-platform/lib/permissions.ts`. Auth is **better-auth** with the `admin` plugin over MongoDB (`lib/auth.ts`).

---

## 1. Master flow — who goes where after sign-in

Every authenticated request flows through `lib/session.ts` (`requireUser` / `requireRole`). The root route `app/page.tsx` reads the session role and redirects to that role's home (`ROLE_HOME`). Each section layout re-guards itself, so a customer who hand-types `/dashboard` is bounced back to `/portal`.

```mermaid
flowchart TD
    Start([Visitor opens platform]) --> HasSession{Signed in?}
    HasSession -- No --> Login["/login or /signup<br/>(email+password, optional Google)"]
    Login --> Auth[["better-auth<br/>/api/auth/[...all]"]]
    Auth --> Mongo[(MongoDB<br/>user + session)]
    Mongo --> Cookie[Signed session cookie<br/>5-min role cache]
    Cookie --> Root
    HasSession -- Yes --> Root["/ reads role<br/>app/page.tsx"]

    Root --> R{role?}
    R -- superadmin --> Admin["/admin"]
    R -- staff --> Dash["/dashboard"]
    R -- content_editor --> Cms["/cms"]
    R -- customer --> Portal["/portal"]
    R -- unknown/none --> Login

    Admin -. wrong role .-> Bounce[redirect to own home]
    Dash -. wrong role .-> Bounce
    Cms -. wrong role .-> Bounce
    Portal -. wrong role .-> Bounce
```

**Deny-by-default:** layouts call `requireRole(...)`. Default role for a fresh signup is `customer` (`DEFAULT_ROLE`). Only a superadmin can elevate someone.

---

## 2. Lead capture & management (the core business flow)

This is the spine of the product. A visitor's form crosses **two apps**, lands in Mongo as a `new`/unassigned lead, then staff work it. Note the two `/api/leads` routes: the landing one is a **same-origin proxy** (keeps the platform URL + ingest key off the browser); the platform one is the **authenticated ingest** that validates and writes.

```mermaid
flowchart TB
    subgraph Visitor["🌐 Anonymous visitor — browser"]
        F1[Fill lead form] --> F2{Client validation<br/>name, PH mobile, address,<br/>property type, consent}
        F2 -- invalid --> F1
        F2 -- valid --> F3[POST /api/leads<br/>raw form shape]
    end

    subgraph Landing["🟡 Landing app — server (proxy)"]
        P1[Re-check name + mobile] --> P2[Map form → canonical lead<br/>fold extras into details]
        P2 --> P3[fetch PLATFORM_INGEST_URL<br/>+ x-ingest-key]
    end

    subgraph Platform["🟢 Platform API — /api/leads"]
        A1{Ingest key configured?} -- no --> A503[503 closed]
        A1 -- yes --> A2{Constant-time<br/>key match?}
        A2 -- no --> A401[401]
        A2 -- yes --> A3[Zod validate payload]
        A3 -- bad --> A422[422]
        A3 -- ok --> A4[Force source=website_form<br/>status=new, unassigned]
        A4 --> A5[insertOne]
    end

    DB[(MongoDB<br/>leads collection)]

    subgraph Staff["👷 Staff / Superadmin — /dashboard"]
        S1[Open lead inbox] --> S2[getLeads — filter/search]
        S2 --> S3[Update status<br/>new→contacted→…]
        S2 --> S4[Assign to staff/superadmin]
        S2 --> S5[Create manual lead]
        S6[Delete lead<br/>superadmin only]
    end

    F3 --> P1
    P3 --> A1
    A5 --> DB
    DB --> S2
    S3 --> DB
    S4 --> DB
    S5 --> DB
    S6 --> DB
    F2 -. success state .-> Done[Thank-you + Viber/Call CTA]
```

**Server-side guarantees**
- The public ingest never trusts the caller: `source` is forced, lead always starts `new` + unassigned, payload bounded by Zod (`app/api/leads/route.ts`).
- Every dashboard action re-verifies the role server-side via `requireRole("staff","superadmin")`; **delete is `superadmin`-only** (`app/dashboard/actions.ts`).
- Assignment checks the target user is actually staff/superadmin before writing.
- Spam (Cloudflare Turnstile) + rate limiting sit *in front of* the landing proxy (NFR-02) — placeholder in the form today.

> [!note] Phase status
> The landing form posts for real to the proxy; the proxy → platform hop is live once `PLATFORM_INGEST_URL` + `LEADS_INGEST_KEY` are set. Google Sheets mirror + Resend notification are later phases (see [[Tech Stack and Architecture]]).

---

## 3. Content / CMS flow (editor → public site)

Content editors and superadmins manage projects, testimonials, and FAQs. Only **published** items leak out to the public read API the marketing site consumes.

```mermaid
flowchart TB
    subgraph Editor["✍️ Content editor / Superadmin — /cms"]
        C1[Open CMS] --> C2[get* lists]
        C2 --> C3[Create / Update item]
        C3 --> C4{Zod validate<br/>per-field errors}
        C4 -- invalid --> C3
        C4 -- valid --> C5[insert / findOneAndUpdate]
        C2 --> C6[Toggle published]
        C2 --> C7[Drag reorder → sortOrder]
        C2 --> C8[Delete item]
        C9[Upload image] --> UT[[UploadThing<br/>content-manager gated]]
    end

    DB[(MongoDB<br/>projects / testimonials / faqs)]

    subgraph PublicAPI["🟢 Public read API — /api/content/[type]"]
        Q1[GET projects/testimonials/faqs] --> Q2[Return ONLY published<br/>force-dynamic]
    end

    subgraph Site["🌐 Marketing site visitor"]
        W1[View projects / testimonials / FAQ pages] --> W2[ISR-cached published content]
    end

    C5 --> DB
    C6 --> DB
    C7 --> DB
    C8 --> DB
    UT --> C3
    DB --> Q1
    Q2 --> W1
```

**Guarantees**
- Every CMS action re-checks `requireRole("content_editor","superadmin")` (`app/cms/actions.ts`); staff get **read-only** content by the permission matrix.
- Image uploads are gated by the same content-manager check inside UploadThing middleware (`app/api/uploadthing/core.ts`), capped at 4 MB.
- The public content API exposes **no privileged data** — published content is public by definition, so no auth key; it returns the exact shape the landing app's old static modules used, making the static→live swap a near drop-in.

---

## 4. User management (superadmin only)

```mermaid
flowchart LR
    subgraph SA["👑 Superadmin — /admin/users"]
        U1[Users manager] --> U2[Create user]
        U1 --> U3[Set role]
        U1 --> U4[Ban / unban]
        U1 --> U5[Impersonate]
        U1 --> U6[Delete / set-password]
    end
    U2 & U3 & U4 & U5 & U6 --> BA[["better-auth admin plugin<br/>/api/auth/[...all]"]]
    BA --> DB[(MongoDB user/session)]
```

`adminRoles: ["superadmin"]` (`lib/auth.ts`) is what unlocks the admin plugin's user/session statements. No other role can reach these endpoints.

---

## 5. Customer portal (self-service)

```mermaid
flowchart LR
    Cust([Customer signs in]) --> Guard[requireRole customer, superadmin]
    Guard --> Portal["/portal — assessment, quotes,<br/>install timeline (Phase 3 stub)"]
```

Customers hold **no** admin-plugin permissions — they manage only their own portal data. Today the page is a Phase-3 placeholder.

---

## Permission matrix (from `lib/permissions.ts`)

| Resource / action | superadmin | staff | content_editor | customer |
|---|:--:|:--:|:--:|:--:|
| user/session admin | ✅ | — | — | — |
| lead: create/read/update/assign | ✅ | ✅ | — | — |
| lead: **delete** | ✅ | — | — | — |
| content: create/read/update/publish/delete | ✅ | read only | ✅ | — |
| own portal data | ✅ | — | — | ✅ |

---

## Cross-cutting notes

- **Two codebases, one design system.** Marketing (`solarworks-landingpage/`) and app (`solarworks-platform/`) are separate Next.js projects; see [[app-backend-architecture]] in agent memory and the white-label rationale in [[website-build-approach]].
- **Trust boundary** is the platform `/api/leads` ingest + every Server Action's `requireRole`. The browser never holds the ingest key or the platform URL.
- **Session strategy:** role is signed into a short-lived (5 min) cookie cache so layouts/redirects read it without a DB round-trip on every request (`lib/auth.ts`).
- **External systems** referenced in flows: Google OAuth (optional sign-in), UploadThing (CMS images), and — in later phases — Google Sheets (lead mirror), Resend (notifications), Cloudflare Turnstile (spam).

> [!tip] Keeping this current
> When you add a route, role, or action, update the matching swimlane and the permission matrix here so this note stays the human-readable map of "how every user works."
