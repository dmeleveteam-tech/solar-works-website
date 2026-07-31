import "server-only"
import { z } from "zod"

/**
 * Server-side environment, validated once at module load. Importing this from a
 * Client Component will fail the build (see `server-only`) — that is intentional,
 * so secrets can never leak into the browser bundle (NFR-02).
 */
const schema = z.object({
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  MONGODB_DB: z.string().min(1).default("solarworks"),
  BETTER_AUTH_SECRET: z.string().min(1, "BETTER_AUTH_SECRET is required"),
  BETTER_AUTH_URL: z.string().url("BETTER_AUTH_URL is required"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  // Cloudinary — CMS image/video/document uploads. Leave any unset to disable
  // uploads (the CMS upload fields will error).
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  // Shared secret the marketing site presents to POST /api/leads. When unset,
  // the public lead-ingest endpoint refuses all requests (deny by default).
  LEADS_INGEST_KEY: z.string().optional(),
  // New-lead email notification (the spec's minimum-required sales alert). Sent
  // via Resend's REST API. When any of these is unset, notification is skipped
  // silently — lead capture itself never depends on it.
  RESEND_API_KEY: z.string().optional(),
  LEADS_NOTIFY_FROM: z.string().optional(),
  // Comma-separated recipient list (sales inbox). Validated lazily at send time.
  LEADS_NOTIFY_TO: z.string().optional(),
  // Public base URL of the platform, used to deep-link the dashboard from the
  // notification email. Falls back to BETTER_AUTH_URL when unset.
  APP_URL: z.string().url().optional(),
  // Chatbot knowledge base (RAG). COHERE_API_KEY embeds chunks + queries;
  // KB_SEARCH_KEY is the shared secret the marketing site presents to
  // POST /api/kb/search. When either is unset, the search endpoint is closed and
  // the chatbot simply falls back to its existing prompt-only behaviour.
  COHERE_API_KEY: z.string().optional(),
  KB_SEARCH_KEY: z.string().optional(),
  // Similarity cutoff (0–1) below which retrieval is treated as "no good match".
  // Tuned in Phase 4; defaults to 0.75 in lib/kb.ts when unset.
  KB_MIN_SCORE: z.coerce.number().min(0).max(1).optional(),
  // AI chatbot inference. The chat brain lives here now (lib/chat/brain.ts) and
  // serves both the marketing site's widget and the Messenger bot, so the
  // provider key belongs to this app. Groq is preferred when both are present:
  // its free tier needs no credit card, whereas an unfunded xAI key
  // authenticates fine but fails every request with permission-denied.
  GROQ_API_KEY: z.string().optional(),
  GROQ_MODEL: z.string().optional(),
  XAI_API_KEY: z.string().optional(),
  XAI_MODEL: z.string().optional(),
  // Shared secret the marketing site presents to POST /api/chat. Unset = the
  // endpoint is closed and the site falls back to its human hand-off message.
  CHAT_API_KEY: z.string().optional(),
  // Facebook Messenger bot. FB_APP_SECRET verifies the X-Hub-Signature-256 on
  // every webhook delivery (the endpoint is publicly reachable, so this is not
  // optional in practice); FB_PAGE_ACCESS_TOKEN sends replies;
  // FB_WEBHOOK_VERIFY_TOKEN is the string we chose for Meta's subscription
  // handshake. Leave any unset to disable the bot entirely.
  FB_APP_SECRET: z.string().optional(),
  FB_PAGE_ACCESS_TOKEN: z.string().optional(),
  FB_WEBHOOK_VERIFY_TOKEN: z.string().optional(),
  // Public base URL of the MARKETING site (not this app). The Messenger menu
  // deep-links visitors to /our-work and /solar-solutions, and the persistent
  // menu carries a "Visit our website" item. Defaulted rather than optional so
  // the menu can never render a broken link.
  MARKETING_SITE_URL: z.string().url().default("https://solar-works-website.vercel.app"),
  // n8n downstream automation. When N8N_LEAD_WEBHOOK_URL is set, every captured
  // lead is POSTed to it (fire-and-forget) so it flows through the n8n canvas.
  // Unset = no dispatch (deny by default). N8N_WEBHOOK_SECRET is optional; when
  // set it is sent as `x-webhook-secret` so the webhook can authenticate us.
  N8N_LEAD_WEBHOOK_URL: z.string().url().optional(),
  N8N_WEBHOOK_SECRET: z.string().optional(),
})

const parsed = schema.safeParse(process.env)

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
    .join("\n")
  throw new Error(`Invalid environment variables:\n${issues}`)
}

export const env = parsed.data

/** True when Google OAuth is fully configured. */
export const googleEnabled = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET)

/** True when Cloudinary uploads are fully configured. */
export const cloudinaryEnabled = Boolean(
  env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET,
)

/** True when new-lead email notifications are fully configured. */
export const leadsNotifyEnabled = Boolean(
  env.RESEND_API_KEY && env.LEADS_NOTIFY_FROM && env.LEADS_NOTIFY_TO,
)

/**
 * True when customer-facing project emails (e.g. "your installation is
 * scheduled") can be sent. Reuses the same Resend sender identity as the
 * lead alert — no separate "from" address needed for a second Resend use.
 */
export const projectEmailEnabled = Boolean(env.RESEND_API_KEY && env.LEADS_NOTIFY_FROM)

/** True when the chatbot knowledge-base search endpoint is fully configured. */
export const kbSearchEnabled = Boolean(env.COHERE_API_KEY && env.KB_SEARCH_KEY)

/**
 * True when in-process RAG retrieval can run (`lib/chat/brain.ts`).
 *
 * Deliberately distinct from `kbSearchEnabled`: that one also requires
 * KB_SEARCH_KEY, the shared secret guarding the public `/api/kb/search`
 * endpoint. The brain calls `searchKb()` directly and needs only the embedding
 * key, so retiring that endpoint must not switch retrieval off.
 */
export const kbRetrievalEnabled = Boolean(env.COHERE_API_KEY)

/** True when an LLM provider is configured for the chat brain. */
export const chatLlmEnabled = Boolean(env.GROQ_API_KEY || env.XAI_API_KEY)

/** True when the marketing site may call POST /api/chat. */
export const chatApiEnabled = Boolean(chatLlmEnabled && env.CHAT_API_KEY)

/** True when the Messenger bot is fully wired (verify + send + signature). */
export const messengerEnabled = Boolean(
  env.FB_APP_SECRET && env.FB_PAGE_ACCESS_TOKEN && env.FB_WEBHOOK_VERIFY_TOKEN,
)

/** True when captured leads should be dispatched to an n8n workflow. */
export const n8nDispatchEnabled = Boolean(env.N8N_LEAD_WEBHOOK_URL)
