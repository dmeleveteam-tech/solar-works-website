---
title: Chatbot RAG and n8n — Progress and Resume
type: handover
tags: [solar-works, chatbot, rag, n8n, cohere, atlas, resume]
created: 2026-07-24
status: in-progress
---

# Chatbot RAG and n8n — Progress and Resume

Session notes for 2026-07-24. This is where to pick up next time. No secrets are
written here — all keys/values live only in the git-ignored `.env` files.

> [!summary] One-line status
> The chatbot RAG backend is **built and verified working** against real MongoDB
> Atlas (20/20 guardrail test passing). A local **n8n sandbox** is installed and
> running for learning. Two things remain before a full end-to-end demo: the
> chatbot's LLM key mismatch, and (optionally) wiring real leads into n8n.

## What was decided

The "automation" was built as **in-app RAG on MongoDB Atlas Vector Search + Cohere
embeddings**, running on the existing serverless (Vercel) stack — deliberately
**not** as an n8n-on-a-VPS workflow. Reasons: the lead pipeline already exists in
the platform (`/api/leads`), a local n8n/Postgres can't be reached by production
Vercel, and the KB is small. n8n is kept only as a **local learning sandbox** and,
later, an optional **downstream** consumer of leads.

Embedding provider: **Cohere `embed-multilingual-v3.0`** (1024 dims) — chosen
because its free trial key needs **no credit card**.

## What is built (all typecheck + lint clean)

Platform (`solarworks-platform`):
- `lib/kb/source-content.ts` — 11 approved, categorized KB chunks (Phase 0 draft; needs Solar Works sign-off + growth to ~20–40).
- `lib/embeddings.ts` — Cohere wrapper (`search_document` vs `search_query`).
- `lib/kb.ts` — `kb_chunks` + `searchKb()` via Atlas `$vectorSearch`; logs every query to `kb_queries` (Phase 6 telemetry).
- `app/api/kb/search/route.ts` — retrieval endpoint, shared-secret `x-kb-key`.
- `scripts/seed-kb.ts`, `scripts/create-kb-index.ts`, `scripts/test-kb-threshold.ts` → `pnpm seed:kb` / `kb:index` / `test:kb`.
- `lib/dns-fix.ts` — local Atlas SRV DNS workaround (see below).

Landing (`solarworks-landingpage`):
- `lib/kb-search.ts` + edit in `app/api/chat/route.ts` — retrieves for open-ended turns, injects grounded context, degrades to prompt-only when unconfigured. Qualification flow untouched.

## Verified working (2026-07-24)

- Atlas connected; `kb_chunks` seeded with 11 embedded chunks (1024d), vector index `kb_vector_index` built and queryable.
- `pnpm test:kb` → **20/20** at threshold **0.75**. In-scope questions ground (~0.83+), out-of-scope escalate (~0.69−), §8.3 red lines correctly escalate or hit the decline-policy chunk.
- Four demo accounts seeded, one per role (password in `.env`/seed script, not here):
  superadmin@solarworks.ph, staff@solarworks.ph, editor@solarworks.ph, customer@solarworks.ph.

## Environment / infra fixes made

- **pnpm native builds:** both `solarworks-platform/pnpm-workspace.yaml` and the n8n folder use `allowBuilds:` to approve `sqlite3`/`esbuild`/`sharp`/etc. non-interactively (the interactive prompt kept failing).
- **Atlas SRV DNS:** this machine refuses SRV lookups (`querySrv ECONNREFUSED`). Fixed with `MONGODB_DNS_SERVERS="1.1.1.1,8.8.8.8"` in `.env` + `lib/dns-fix.ts`, imported by `lib/mongodb.ts` and every seed script. **Local only** — leave unset on Vercel (its DNS resolves SRV fine).
- Env keys added to both `.env` and `.env.example`: `COHERE_API_KEY`, `KB_SEARCH_KEY`, `KB_SEARCH_URL`, `KB_MIN_SCORE`, plus platform `MONGODB_URI`/`MONGODB_DB`/`BETTER_AUTH_SECRET`/`BETTER_AUTH_URL`/`MONGODB_DNS_SERVERS`.

## How to run everything

Platform (port 3001):
```
cd solarworks-platform
pnpm dev
```
Login at http://localhost:3001/login as superadmin@solarworks.ph (password in .env / seed-roles.ts).

Landing site (port 3000) — needed to test the chatbot end-to-end:
```
cd solarworks-landingpage
pnpm dev
```

Re-seed / re-test KB (from `solarworks-platform`):
```
pnpm kb:index      # once; index persists on the Atlas cluster
pnpm seed:kb       # embed + upload chunks (idempotent)
pnpm test:kb       # threshold report
```

Local n8n sandbox (see [[n8n local sandbox]] in agent memory):
```
cd C:\dev-projects\n8n-local
node node_modules/n8n/bin/n8n      # editor at http://localhost:5678
```

## Where I left off in n8n

Building a first learning workflow to watch data flow: **Webhook (POST, path `lead-test`) → Edit Fields (Set) → Respond to Webhook**. To test in n8n 2.x: click **Execute workflow** (bottom-center of canvas) — arms the test webhook for 120s — then POST to the **test** URL:
```
curl -X POST http://localhost:5678/webhook-test/lead-test -H "content-type: application/json" -d "{\"name\":\"Juan Dela Cruz\",\"phone\":\"09171234567\",\"source\":\"website_form\"}"
```
Nodes light up green = success. Note n8n 2.x: `/webhook-test/…` = test URL (live only after Execute/Listen); `/webhook/…` = production URL (live only after **Publish**, a new separate button — saving no longer activates it).

## Next steps (resume here)

1. **Fix the chatbot LLM key mismatch (blocks the bot from replying).** `landing/app/api/chat/route.ts` reads `GROQ_API_KEY` (api.groq.com), but `.env` has an **xAI/Grok** key (`XAI_API_KEY`, `XAI_MODEL=grok-4.5`) and no Groq key. Fix: either switch the chat route to xAI (OpenAI-compatible: change URL to `https://api.x.ai/v1/...`, key var, model default) OR add a real `GROQ_API_KEY`. RAG retrieval already works; the bot just can't generate until this is resolved.
2. **(Optional) Wire real leads into n8n** — add an env-gated `N8N_LEAD_WEBHOOK_URL` POST in the platform lead ingest so every form + chatbot lead flows through the n8n canvas (downstream automation to Sheets/Slack/etc.).
3. **Grow the KB (Phase 0)** — expand `lib/kb/source-content.ts` toward 20–40 chunks and get Solar Works sign-off; re-run `pnpm seed:kb`.
4. **Phase 5/6** — content-sync (the CMS already lets non-devs edit FAQs; decide if n8n sync is even needed) and monitoring via the `kb_queries` collection.
5. **Production (Vercel)** — set `COHERE_API_KEY`, `KB_SEARCH_KEY`, `KB_SEARCH_URL` (= platform's real HTTPS URL), `KB_MIN_SCORE` in **both** Vercel projects. Use the normal `mongodb+srv://…` URI there (no DNS workaround needed). The Atlas vector index already exists on the cluster.
6. **End-to-end smoke test** — chat a KB question → grounded answer + a row in `kb_queries`; submit a lead → appears in `/dashboard` inbox.

## Related
- [[Platform Deployment Goal Prompt]]
- [[Integration - AI Lead Chatbot]]
- [[Admin Handover and Go-Live Guide]]
