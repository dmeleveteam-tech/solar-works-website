/**
 * Escape a string for safe interpolation into HTML we build ourselves (email
 * bodies, mainly). No imports, no `server-only` — pure enough to unit-test
 * and shared by every hand-built HTML template in `./email-alerts.ts` and
 * `./email-templates/*`.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
