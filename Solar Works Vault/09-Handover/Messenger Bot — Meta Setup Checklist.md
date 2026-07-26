---
title: Messenger Bot — Meta Setup Checklist
type: handover
tags: [solar-works, messenger, integration, checklist, meta]
status: in-progress
---

# Messenger Bot — Meta Setup Checklist (Phase 3)

Console work that cannot be done from the codebase. **Start this in parallel with
the code** — App Review is the critical path, not the implementation.

See [[Integration - Facebook Messenger Bot]] for the architecture.

> **2026-07-26 — dev environment rebuilt from scratch.** The original app and its
> Page token were retired (the token had been committed to `.env` and shared, so
> it was rotated by deleting the app). Current dev setup:
>
> | | |
> |---|---|
> | App | `1353913430225067` |
> | Page | "Rojan's Page Test 2", classic ID `1184709338067781` |
> | Callback | a `cloudflared` quick tunnel → `localhost:3001` |
>
> **The Page ID trap.** The Page's URL is `profile.php?id=61592501460520`, but
> that is the new-Pages *profile* ID. Graph, the Send API and the webhook's
> `entry.id` all speak the **classic** ID from Business Settings. Use the classic
> one everywhere.
>
> **The failure that cost the most time:** subscribing the webhook *fields* at
> the app level does NOT subscribe the *Page*. With fields set and the Page
> unsubscribed, Meta verifies the callback URL happily and then never delivers a
> single event — no error anywhere. Verify with:
> ```
> curl "https://graph.facebook.com/v21.0/<page-id>/subscribed_apps?access_token=<page-token>"
> ```
> `{"data":[]}` means unsubscribed. Fixing it needs `pages_manage_metadata`,
> which the Messenger-settings Page token does NOT carry — get one from the Graph
> API Explorer, then `POST .../subscribed_apps` with `subscribed_fields`.

---

## 1. App and Page

- [x] developers.facebook.com → **Create App** → type **Business**
- [x] Add the **Messenger** product
- [x] Link the Solar Works **Facebook Page** (you need an admin role on it)
- [x] Generate a **Page Access Token** → `FB_PAGE_ACCESS_TOKEN`
- [x] Settings → Basic → copy the **App Secret** → `FB_APP_SECRET`

Verify the token and Page agree before anything else — `/me` needs a scope we
don't have, so use `debug_token`, which is authoritative:

```
curl "https://graph.facebook.com/v21.0/debug_token?input_token=$T&access_token=$T"
```

Expect `type: PAGE`, `profile_id` equal to `FB_PAGE_ID`, `expires_at: 0`
(never expires) and `pages_messaging` in `scopes`.

> The App Secret is new in this build. The old handoff webhook did not verify
> signatures at all, which left a publicly reachable endpoint anyone could POST
> forged events to. The new webhook rejects any delivery without a valid
> `X-Hub-Signature-256`, so **the bot will not respond until this is set**.

## 2. Webhook

- [x] Choose any random string for `FB_WEBHOOK_VERIFY_TOKEN` (we pick it, Meta
      just echoes it back) — generate with `openssl rand -hex 24`
- [x] Callback URL: `https://<platform-domain>/api/messenger/webhook`
      **Note the change of app and path.** The old one was on the marketing site
      at `/api/facebook/webhook`; the bot lives in the platform app because it
      needs the database.
- [x] Subscribe **the Page** to these fields — all four are required, and this is
      a separate step from ticking the fields at app level (see the warning above):
      `messages`, `messaging_postbacks`, `messaging_optins`, `messaging_referrals`
- [x] Verify the handshake succeeds (Meta calls `GET` immediately on save)

Prove the handshake locally before pasting the URL into Meta — a failed verify
makes you re-enter the whole form:

```
curl "http://localhost:3001/api/messenger/webhook?hub.mode=subscribe&hub.verify_token=$TOKEN&hub.challenge=ping"
```

`ping` = wired. `{"error":"Verification failed."}` = wrong token.
`{"error":"Messenger is not configured."}` = one of the three `FB_*` is unset,
which is a different bug entirely.

## 2b. Get Started button and persistent menu

The bot's four entry points (Start assessment · Ask a question · Our work &
pricing · Talk to a human) live in `lib/messenger/menu.ts`, but **Meta stores
them against the Page, not against our deploy** — editing that file changes
nothing for visitors until you run:

```
pnpm messenger:profile          # apply, then read back to verify
pnpm messenger:profile --show   # what Meta currently holds
pnpm messenger:profile --clear  # retiring the bot / moving Page
```

Re-run it after any menu copy change and once when pointing at a new Page.

## 3. Environment variables

Platform app (Vercel + local `.env`):

| Var | Source |
|---|---|
| `FB_APP_SECRET` | Settings → Basic |
| `FB_PAGE_ACCESS_TOKEN` | Messenger → Access Tokens |
| `FB_WEBHOOK_VERIFY_TOKEN` | you choose |
| `GROQ_API_KEY` (+ optional `GROQ_MODEL`) | moved from the landing app |
| `CHAT_API_KEY` | new shared secret, must match the landing app |

Landing app: **remove** `GROQ_API_KEY`, `GROQ_MODEL`, `XAI_*`, `KB_SEARCH_URL`,
`KB_SEARCH_KEY`; **add** `CHAT_API_URL`, `CHAT_API_KEY`.

Keep `NEXT_PUBLIC_FB_PAGE_ID` on the landing app — the `m.me` "Continue on
Messenger" link still uses it.

## 4. Compliance — required before App Review will pass

- [ ] **Privacy Policy URL** in App Settings, publicly reachable
      (the page exists at `<marketing-site>/privacy` — it just needs pasting in)
- [x] **Data Deletion Request callback** — BUILT at
      `app/api/messenger/data-deletion/route.ts`. Paste this into App Settings →
      Basic → "Data Deletion Request URL":
      `https://<platform-domain>/api/messenger/data-deletion`

      It verifies Meta's `signed_request` (a *different* scheme from the
      webhook's `X-Hub-Signature-256` — see `lib/messenger/signed-request.ts`),
      drops the whole `messenger_sessions` document for that PSID, and returns
      the `{url, confirmation_code}` shape Meta validates against. Forged,
      algorithm-downgraded and malformed requests all get 403.

      It deliberately does **not** delete leads: a lead was captured under its
      own explicit consent and is a legitimate business record. The status page
      tells users to email us for that.
- [ ] Confirm the consent wording the bot shows satisfies the **Data Privacy Act**
      (RA 10173). The bot records PSID + timestamp + the exact accepted string on
      both the session and the lead, which is a stronger audit trail than the web
      widget's client-supplied boolean.

## 5. App Review — the long pole

- [ ] **Business Verification** (company documents; can take days)
- [ ] Request the **`pages_messaging`** permission
- [ ] Submit a screencast of the full flow: visitor messages the Page → bot
      qualifies → consent tap → lead appears in the dashboard
- [ ] Explain the use case as lead qualification for our own Page — reviewers
      reject vague submissions

**Until approval, the bot only replies to Page admins, developers and testers**
added under App Roles. That is enough to test the whole flow end to end; budget
days-to-weeks for approval before public launch.

## 6. Testing order

1. Add yourself as a **Tester** under App Roles
2. Message the Page from your personal account → expect the qualification flow
3. Complete it through the consent tap → check the lead lands in the dashboard
   with source **Messenger** and the consent detail recorded
4. Send the same message twice quickly → confirm **no duplicate lead** (the `mid`
   idempotency claim)
5. Tap the site's "Continue on Messenger" link → confirm the **old handoff
   behaviour is unchanged**: the Tagalog welcome, no bot flow, human takes over
6. Send a photo → expect the "please type" reply, no model call

## 7. Cutover — DONE 2026-07-26

- [x] Switch the Meta callback URL to the platform, confirm events arrive
- [x] Delete `solarworks-landingpage/app/api/facebook/webhook/route.ts` and
      `solarworks-landingpage/lib/facebook.ts`
- [x] **Keep** `solarworks-landingpage/lib/messenger.ts` — `chat-launcher.tsx`,
      `lead-form.tsx` and `native-inquiry-form.tsx` all render the m.me link
- [x] Retire `FB_PAGE_ID`, `FB_PAGE_ACCESS_TOKEN` and `FB_WEBHOOK_VERIFY_TOKEN`
      from the marketing app entirely — with the webhook gone it reads none of
      them. It now holds `NEXT_PUBLIC_FB_PAGE_ID` and nothing else, so no
      Messenger secret exists outside the platform. **Do not reinstate them.**

## 7b. Going live — remaining switches

- [ ] Point the Meta callback URL at `https://solar-works-admin.vercel.app/api/messenger/webhook`
      (dev currently uses a `cloudflared` quick tunnel, whose URL dies with the
      process). Vercel already holds every `FB_*` var for Production and Preview.
- [ ] Re-run `pnpm messenger:profile` against the live Solar Works Page after
      swapping `FB_PAGE_ACCESS_TOKEN` / `FB_PAGE_ID` to it
- [ ] Set `MARKETING_SITE_URL` to the real marketing domain once it is off
      `*.vercel.app` — the persistent menu deep-links to it

## Watch after launch

**Groq free tier.** Web chat and Messenger now share one key and an 8,000
tokens/minute ceiling, and each tool turn costs two model calls. Messenger
traffic is a very different profile from a widget on our own site. The existing
rate-limit retry and fallback wording degrade gracefully, but revisit a paid tier
before App Review is granted — a public Page bot hitting the free ceiling reads
to visitors as a broken bot.
