---
title: Messenger Bot — Meta Setup Checklist
type: handover
tags: [solar-works, messenger, integration, checklist, meta]
status: not-started
---

# Messenger Bot — Meta Setup Checklist (Phase 3)

Console work that cannot be done from the codebase. **Start this in parallel with
the code** — App Review is the critical path, not the implementation.

See [[Integration - Facebook Messenger Bot]] for the architecture.

---

## 1. App and Page

- [ ] developers.facebook.com → **Create App** → type **Business**
- [ ] Add the **Messenger** product
- [ ] Link the Solar Works **Facebook Page** (you need an admin role on it)
- [ ] Generate a **Page Access Token** → `FB_PAGE_ACCESS_TOKEN`
- [ ] Settings → Basic → copy the **App Secret** → `FB_APP_SECRET`

> The App Secret is new in this build. The old handoff webhook did not verify
> signatures at all, which left a publicly reachable endpoint anyone could POST
> forged events to. The new webhook rejects any delivery without a valid
> `X-Hub-Signature-256`, so **the bot will not respond until this is set**.

## 2. Webhook

- [ ] Choose any random string for `FB_WEBHOOK_VERIFY_TOKEN` (we pick it, Meta
      just echoes it back) — generate with `openssl rand -hex 24`
- [ ] Callback URL: `https://<platform-domain>/api/messenger/webhook`
      **Note the change of app and path.** The old one was on the marketing site
      at `/api/facebook/webhook`; the bot lives in the platform app because it
      needs the database.
- [ ] Subscribe the Page to these fields — all four are required:
      `messages`, `messaging_postbacks`, `messaging_optins`, `messaging_referrals`
- [ ] Verify the handshake succeeds (Meta calls `GET` immediately on save)

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
- [ ] **Data Deletion Request callback** — newly required for us, because the bot
      now stores conversation transcripts against a PSID (`messenger_sessions`).
      Meta will not approve an app that stores user data without one.
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

## 7. Cutover

- [ ] Switch the Meta callback URL to the platform, confirm events arrive
- [ ] Delete `solarworks-landingpage/app/api/facebook/webhook/route.ts` and
      `solarworks-landingpage/lib/facebook.ts`
- [ ] **Keep** `solarworks-landingpage/lib/messenger.ts` — `chat-launcher.tsx`,
      `lead-form.tsx` and `native-inquiry-form.tsx` all render the m.me link

## Watch after launch

**Groq free tier.** Web chat and Messenger now share one key and an 8,000
tokens/minute ceiling, and each tool turn costs two model calls. Messenger
traffic is a very different profile from a widget on our own site. The existing
rate-limit retry and fallback wording degrade gracefully, but revisit a paid tier
before App Review is granted — a public Page bot hitting the free ceiling reads
to visitors as a broken bot.
