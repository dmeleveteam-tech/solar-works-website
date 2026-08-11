/**
 * Analytics event contract (see vault: "Analytics and Conversion Events").
 * `track()` forwards a conversion event to GA4 and Meta Pixel if — and only if —
 * their scripts have loaded (which happens only after the visitor consents). It
 * no-ops safely on the server and before consent, so call sites never need to
 * guard.
 */

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID
export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID

/** Whether any analytics provider is configured at all. */
export const analyticsConfigured = Boolean(GA_ID || META_PIXEL_ID)

/** Documented conversion events. Keep values in sync with the vault contract. */
export const ANALYTICS_EVENTS = {
  testimonialVideoPlay: "testimonial_video_play",
  leadFormStart: "lead_form_start",
  leadFormSubmit: "lead_form_submit",
  messengerOpen: "messenger_open",
  phoneClick: "phone_click",
  viberClick: "viber_click",
  whatsappClick: "whatsapp_click",
  projectView: "project_view",
  solutionView: "solution_view",
} as const

export type AnalyticsEvent =
  (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS]

type Params = Record<string, string | number | boolean | undefined>

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    fbq?: (...args: unknown[]) => void
  }
}

/** Send a conversion event to whichever providers are loaded. */
export function track(event: AnalyticsEvent, params?: Params): void {
  if (typeof window === "undefined") return
  window.gtag?.("event", event, params ?? {})
  window.fbq?.("trackCustom", event, params ?? {})
}
