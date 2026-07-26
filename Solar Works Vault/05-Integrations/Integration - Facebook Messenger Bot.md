---
title: Integration - Facebook Messenger Bot
type: plan
tags: [solar-works, website, integration, chatbot, messenger, plan]
status: phases-1-2-implemented
---

> **2026-07-26 — Phases 1 and 2 are built.** Platform typecheck clean, 93/93
> tests pass, landing typecheck clean. Nothing is committed. Phase 3 (Meta
> console) is outstanding and gates launch — see
> [[Messenger Bot — Meta Setup Checklist]].

# Facebook Messenger Bot — Implementation Plan

Turn the existing one-way Messenger handoff into a full Solar Assistant channel,
by first extracting the chat brain into the platform so both the web widget and
Messenger run the same logic.

## Where we are today

| Piece | Location | State |
|---|---|---|
| Chat brain (prompt, tools, LLM calls) | `solarworks-landingpage/app/api/chat/route.ts` | ~1100 lines, stateless, coupled to the browser widget |
| RAG retrieval | landing `lib/kb-search.ts` → platform `POST /api/kb/search` | working, shared-key HTTP hop |
| Lead capture | landing `lib/leads.ts` → platform `POST /api/leads` | working, single choke point |
| Messenger | landing `app/api/facebook/webhook/route.ts` + `lib/facebook.ts` | **handoff only** — replies once to a `web_lead` referral, then a human takes over |
| Messenger deep link | landing `lib/messenger.ts` (`m.me/<id>?ref=web_lead`) | working |

The two apps are **independent pnpm projects** (`packages: []` in both
workspace files, no shared dep). Cross-app code sharing is therefore not
available; the established pattern is server-to-server HTTP with a shared key
header. This plan follows that pattern rather than introducing a monorepo.

## Target architecture

```
                    ┌─────────────────────────────────────────┐
 web widget ──────► │ landing /api/chat  (thin proxy)         │
                    └───────────────┬─────────────────────────┘
                                    │ x-chat-key
                                    ▼
                    ┌─────────────────────────────────────────┐
 Messenger ───────► │ platform /api/messenger/webhook         │
                    │            │                            │
                    │            ▼                            │
                    │    lib/chat/brain.ts  runChatTurn()     │
                    │      ├── lib/kb.ts        (in-process)  │
                    │      └── lib/leads-ingest (in-process)  │
                    └─────────────────────────────────────────┘
```

Why the platform, not the landing app:
- Messenger needs **persistent per-user state**; only the platform has Mongo.
- The brain already depends on the KB and the leads inbox, both platform-side —
  moving it there removes two HTTP hops rather than adding them.
- Landing stays a marketing site with no database and no LLM key.

Net latency for web chat is unchanged: today it is `landing → platform (KB)`,
after it is `landing → platform → KB in-process`.

---

## Phase 1 — Extract the chat brain into the platform

**Goal:** the web chatbot behaves identically, with zero changes to any client
component. This phase ships and is verifiable on its own.

### 1.1 Platform: new `lib/chat/`

- `lib/chat/vocab.ts` — copy of landing `lib/chat-ui.ts` (canonical option lists,
  `DETAIL_FIELDS`, `CONSENT_ACCEPT_TEXT`, `normalizePhMobile`, `ChatUi` type).
  Landing keeps its copy because the client components render from it.
  *Known cost:* two copies. Drift only matters for `DETAIL_FIELD_KEYS` and the
  consent strings (options travel on the wire inside the `ChatUi` block, so they
  cannot drift). Header comment in both files naming the platform copy as
  authoritative for validation.
- `lib/chat/brain.ts` — everything currently in landing `/api/chat` below the
  HTTP layer: system prompt, `followUpPrompt`, tool definitions, `callLlm` +
  rate-limit retry, `recoverToolCall`, `salvageLeakedUi`, `uiFromProse`,
  `buildUi`, `collectedFields`, `handleSaveLead`. Public surface:

  ```ts
  export type ChatChannel = "web" | "messenger"
  export type ChatTurnInput = {
    messages: { role: "user" | "assistant"; content: string }[]
    attribution: Record<string, string>
    consentConfirmed: boolean
    leadAlreadySaved: boolean
    channel: ChatChannel
  }
  export type ChatTurnResult = {
    message: string
    leadSaved: boolean
    ui?: ChatUi
    suggestions?: string[]
  }
  export async function runChatTurn(input: ChatTurnInput): Promise<ChatTurnResult>
  ```

  `ChatTurnResult` is byte-identical to today's response JSON, so the widget's
  contract is preserved.

- `channel` selects the toolset and a prompt fragment. Messenger withholds
  `collect_details` (no multi-field form exists there) and instructs the model to
  ask contact fields one at a time.

### 1.2 Platform: extract lead creation

`app/api/leads/route.ts` currently inlines insert + `notify` + `notifyNewLead` +
`dispatchLeadToN8n`. Move that block to `lib/leads-ingest.ts` as
`createLead(payload)`. The route becomes auth + validate + call; the brain calls
`createLead` directly instead of HTTP-ing back into its own app.

### 1.3 Platform: `POST /api/chat`

Mirrors `/api/kb/search` exactly — `x-chat-key` constant-time comparison, zod
body schema, `createRateLimiter` backstop, deny-by-default when unconfigured.
Calls `runChatTurn({ ...body, channel: "web" })`.

### 1.4 Landing: shrink `/api/chat` to a proxy

- New `lib/chat-proxy.ts`, modelled on `lib/kb-search.ts`: never throws, returns
  the platform's JSON or `null`.
- `app/api/chat/route.ts` keeps only input validation (`MAX_MESSAGES`,
  `MAX_CONTENT`), `HUMAN_FALLBACK`, and the rate-limit fallback wording, so the
  site still degrades gracefully when the platform is unreachable or unconfigured.
- Delete landing `lib/kb-search.ts` (the brain now calls `searchKb()` in-process).

### 1.5 Environment

| Var | Move |
|---|---|
| `GROQ_API_KEY`, `GROQ_MODEL`, `XAI_API_KEY`, `XAI_MODEL` | landing → platform `lib/env.ts` |
| `KB_SEARCH_URL`, `KB_SEARCH_KEY` | retire from landing (platform keeps `KB_SEARCH_KEY` until the endpoint is removed) |
| `CHAT_API_URL`, `CHAT_API_KEY` | new, landing |
| `CHAT_API_KEY` | new, platform |

Add `chatEnabled` alongside the existing `kbSearchEnabled` / `leadsNotifyEnabled`
booleans.

### 1.6 Tests (`pnpm test` in platform — `node --test lib/**/*.test.ts`)

New `lib/chat/brain.test.ts` covering the pure helpers, which currently have no
coverage at all: `salvageLeakedUi`, `uiFromProse`, `buildUi` (incl. snake_case
field resolution), `collectedFields`, `retryAfterFrom` (the `8m6.864s` case),
`normalizePhMobile`.

### Phase 1 acceptance

Run both apps locally; the web chat completes a full qualification → consent →
`save_lead` cycle and the lead appears in the inbox as **Website Chatbot**. No
file under `components/` changed.

---

## Phase 2 — Messenger as a first-class channel

### 2.1 Session state — the core new piece

Messenger sends one message plus a PSID; there is no client-held transcript.
New Mongo collection `messenger_sessions`:

```ts
{
  _id: psid,
  messages: { role, content }[],   // capped at MAX_MESSAGES (40)
  consentConfirmed: boolean,
  consentAt: Date | null,
  leadAlreadySaved: boolean,
  attribution: Record<string, string>,
  seenMids: string[],              // capped ~50, idempotency
  updatedAt: Date,                 // TTL index, 30 days
}
```

With this, `collectedFields`, `mustSaveLead` and the forced-save-on-consent logic
work unchanged.

### 2.2 `lib/messenger/`

- `verify.ts` — **`X-Hub-Signature-256` HMAC** against `FB_APP_SECRET`,
  constant-time. Missing today; the endpoint is publicly reachable.
- `send.ts` — Send API wrapper: text, quick replies, `sender_action`
  (`mark_seen`, `typing_on`). Replaces `lib/facebook.ts` and **drops the
  `MESSAGE_TAG` / `CONFIRMED_EVENT_UPDATE`** it currently sets — a normal reply
  inside the 24-hour window must be `messaging_type: "RESPONSE"`; using a tag for
  it is a policy violation risk.
- `render.ts` — `ChatUi` → Messenger payload.
- `sessions.ts` — load/save/TTL.

### 2.3 The 20-character quick-reply cap

Meta caps quick-reply `title` at 20 chars and 13 options, but the separate
`payload` field allows 1000. So: **title = short display text, payload = the
canonical labelled string** the brain already expects
(`formatChoiceAnswer` output, or `CONSENT_ACCEPT_TEXT` verbatim). The webhook
feeds the payload into the transcript, so `collectedFields` and the forced save
keep working untouched.

Only one canonical option exceeds 20 chars — `"Business operating cost"` (23) —
needing a display-only short form. `"Hybrid with Battery"` (19) just fits.
A unit test asserts every rendered title is ≤20 chars and every payload round-
trips to a value `save_lead` accepts, so adding an option to `vocab.ts` later
cannot silently break Messenger.

`request_consent` → two quick replies, titles `"Yes, I agree"` / `"Not now"`,
payloads the canonical accept/decline strings. The tap becomes the consent
record: PSID + timestamp + exact wording stored on the session and copied into
the lead's `Consent` detail. That is a **stronger** Data Privacy Act audit trail
than the current client-supplied boolean, which the code's own comment notes is
not tamper-proof.

`collect_details` → withheld (see 1.1); the model asks fields sequentially.

### 2.4 `app/api/messenger/webhook/route.ts`

- `GET` — the existing `hub.verify_token` handshake, moved.
- `POST` — verify signature → **return 200 immediately** → process via
  `after()` from `next/server`. Necessary because Meta requires a response within
  20s while a turn can take up to 30s (`maxDuration = 30`, plus a 15s rate-limit
  wait). Meta retries aggressively on non-200, which is exactly how duplicate
  leads would be created.
- Idempotency on `message.mid` against `seenMids` before any model call.
- Per-PSID rate limit via the existing `lib/rate-limit.ts`.
- Ignore `is_echo`, non-text attachments (reply asking for text), and
  `messaging_optins`.
- **Preserve the existing `ref === "web_lead"` behaviour** — that referral still
  gets the Tagalog welcome and a human handover, not the bot.
- Attribution: `referral.ref` / `postback.referral` → `utm_source: messenger`,
  `utm_campaign: <ref>`.

### 2.5 Lead source

Add `"messenger"` to `LEAD_SOURCES` in `lib/leads-shared.ts`, `PUBLIC_SOURCES` in
`app/api/leads/route.ts`, and `SOURCE_LABEL` (`"Messenger"`). Check the inbox
filter UI in `components/dashboard/leads-manager.tsx` picks it up from the enum
rather than a hardcoded list.

### 2.6 Retire the old route

Once Meta's callback URL points at the platform, delete landing
`app/api/facebook/webhook/route.ts` and `lib/facebook.ts`. Keep
`lib/messenger.ts` — the m.me link is still shown by `chat-launcher.tsx`,
`lead-form.tsx` and `native-inquiry-form.tsx`.

---

## Phase 3 — Meta platform setup (not code; start early, it gates launch)

- Facebook App (Business type) + Messenger product + Page linked.
- Page Access Token; **App Secret** for signature verification (new var
  `FB_APP_SECRET`).
- Webhook subscription fields: `messages`, `messaging_postbacks`,
  `messaging_optins`, `messaging_referrals`.
- **Business Verification + App Review for `pages_messaging`** — required to
  message anyone outside the app's admin/tester list. Days to weeks; this is the
  critical path, not the code.
- Privacy Policy URL and a **Data Deletion Request callback** (Meta requires one
  for apps storing user data — and we now store transcripts).
- Test with the Page in dev mode against a tester account first.

---

## Risks

1. **Groq free tier.** Web and Messenger now share one key and an 8,000
   tokens/minute ceiling, and each tool turn costs two model calls. Messenger
   traffic is a different profile from a widget on our own site. Mitigation: the
   existing rate-limit retry + fallback wording already handles it gracefully;
   revisit a paid tier before App Review is granted.
2. **Duplicate leads from webhook retries.** Mitigated by `mid` idempotency plus
   the existing `leadAlreadySaved` guard, now persisted per PSID.
3. **Platform outage takes the web chatbot with it.** Already true for the KB
   and lead capture; landing keeps `HUMAN_FALLBACK` so it degrades to Viber.
4. **`vocab.ts` duplication** between apps — bounded and tested (2.3).

## Sequencing

Phase 1 is independently shippable and worth doing regardless — it is also the
prerequisite for putting the assistant on Viber or WhatsApp later. Start Phase 3
paperwork in parallel with Phase 1, since App Review is the long pole.

## Related

- [[Integration - AI Lead Chatbot]]
- [[Integration - Google Drive Knowledge Base]]
- [[Lead Capture Form]]
