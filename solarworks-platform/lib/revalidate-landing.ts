import "server-only"

const BASE = process.env.LANDING_SITE_URL?.replace(/\/$/, "")
const SECRET = process.env.REVALIDATE_SECRET

/**
 * Tell the marketing site to drop its cached copy of `type` right now, instead
 * of waiting out its ISR window (up to 5 minutes) — so a delete, edit, or
 * publish toggle in the CMS shows up on the live site immediately.
 *
 * Fire-and-forget and best-effort: unset env vars or a failed request never
 * block or fail the calling mutation. The public site still catches up on its
 * own within the ISR window either way (see solarworks-landingpage's
 * lib/content/api.ts).
 */
export function revalidateLanding(type: "projects" | "testimonials" | "faqs" | "solutions"): void {
  if (!BASE || !SECRET) return
  fetch(`${BASE}/api/revalidate`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-revalidate-secret": SECRET },
    body: JSON.stringify({ type }),
  }).catch((err) => {
    console.error(`[revalidate-landing] failed to notify landing site for "${type}":`, err)
  })
}
