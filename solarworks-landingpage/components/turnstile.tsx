"use client"

import * as React from "react"
import Script from "next/script"

/**
 * Cloudflare Turnstile widget (NFR-02 spam protection). Renders only when
 * NEXT_PUBLIC_TURNSTILE_SITE_KEY is configured, so local/dev without keys keeps
 * the form fully usable. The token is lifted to the parent via `onVerify` and
 * sent with the lead payload; the server is the real gate (it re-verifies the
 * token with Cloudflare before accepting the lead).
 */

type TurnstileApi = {
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string
      callback: (token: string) => void
      "expired-callback"?: () => void
      "error-callback"?: () => void
      theme?: "auto" | "light" | "dark"
      action?: string
    },
  ) => string
  remove: (id: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

export const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

export function Turnstile({
  onVerify,
  onExpire,
}: {
  onVerify: (token: string) => void
  onExpire?: () => void
}) {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const widgetIdRef = React.useRef<string | null>(null)
  // next/script calls onLoad even when the script was already loaded on an
  // earlier page (it caches and replays the event), so this covers both the
  // first load and client-side navigations back to the form.
  const [ready, setReady] = React.useState(false)

  React.useEffect(() => {
    if (!ready || !TURNSTILE_SITE_KEY) return
    const el = containerRef.current
    const api = window.turnstile
    if (!el || !api || widgetIdRef.current) return

    widgetIdRef.current = api.render(el, {
      sitekey: TURNSTILE_SITE_KEY,
      action: "lead_form",
      callback: onVerify,
      "expired-callback": () => onExpire?.(),
      "error-callback": () => onExpire?.(),
    })

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
        widgetIdRef.current = null
      }
    }
  }, [ready, onVerify, onExpire])

  if (!TURNSTILE_SITE_KEY) return null

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={() => setReady(true)}
      />
      <div ref={containerRef} />
    </>
  )
}
