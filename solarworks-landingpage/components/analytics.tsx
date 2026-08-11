"use client"

import * as React from "react"
import Script from "next/script"
import { usePathname } from "next/navigation"

import {
  ANALYTICS_EVENTS,
  GA_ID,
  META_PIXEL_ID,
  track,
} from "@/lib/analytics"
import { useConsent } from "@/components/consent-provider"

/**
 * Loads GA4 and Meta Pixel — but only after the visitor grants consent. Also
 * wires the "high-intent contact" conversion events (phone / Viber / WhatsApp /
 * Messenger) with a single delegated click listener, so we don't have to touch
 * every link across the header, footer, mobile CTA bar, and chat launcher.
 */
export function Analytics() {
  const { consent } = useConsent()
  const enabled = consent === "granted"

  // Delegated contact-link tracking. Safe to attach always: track() no-ops
  // until the provider scripts have loaded (i.e. until consent is granted).
  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      const target = e.target as HTMLElement | null
      const anchor = target?.closest("a")
      const href = anchor?.getAttribute("href")?.toLowerCase()
      if (!href) return
      if (href.startsWith("tel:")) track(ANALYTICS_EVENTS.phoneClick)
      else if (href.startsWith("viber:") || href.includes("viber"))
        track(ANALYTICS_EVENTS.viberClick)
      else if (href.includes("wa.me") || href.includes("whatsapp"))
        track(ANALYTICS_EVENTS.whatsappClick)
      else if (href.includes("m.me")) track(ANALYTICS_EVENTS.messengerClick)
    }
    document.addEventListener("click", onClick)
    return () => document.removeEventListener("click", onClick)
  }, [])

  // Manual page_view on client-side navigations (Meta Pixel needs this; GA4's
  // enhanced measurement also covers it, so we only re-fire the Pixel here).
  const pathname = usePathname()
  const firstLoad = React.useRef(true)
  React.useEffect(() => {
    if (!enabled) return
    if (firstLoad.current) {
      firstLoad.current = false
      return
    }
    window.fbq?.("track", "PageView")
  }, [pathname, enabled])

  if (!enabled) return null

  return (
    <>
      {GA_ID ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_ID}');`}
          </Script>
        </>
      ) : null}

      {META_PIXEL_ID ? (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${META_PIXEL_ID}');
fbq('track', 'PageView');`}
        </Script>
      ) : null}
    </>
  )
}
