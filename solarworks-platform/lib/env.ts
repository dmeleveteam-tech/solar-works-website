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
  BETTER_AUTH_URL: z.string().url().default("http://localhost:3001"),
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
