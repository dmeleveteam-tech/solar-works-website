import { ImageResponse } from "next/og"

import { siteConfig } from "@/lib/site-config"

// Rich social-sharing preview so links shared to Messenger, Viber, WhatsApp,
// Facebook, etc. render a branded card instead of a blank box.
export const alt = `${siteConfig.name} — ${siteConfig.tagline}`
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

// Brand tokens expressed as hex/rgb — Satori (next/og) does not resolve the
// site's oklch CSS variables, so the palette is mirrored here in supported
// colour formats. Keep in sync with globals.css if the brand hue changes.
const BRAND_YELLOW = "#f6c445"
const INK = "#141210"
const MUTED = "rgba(255,255,255,0.66)"

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "88px 96px",
          backgroundColor: INK,
          backgroundImage:
            "radial-gradient(1000px 520px at 88% -10%, rgba(246,196,69,0.22), transparent 60%)",
          fontFamily: "sans-serif",
        }}
      >
        {/* Brand lockup */}
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 76,
              height: 76,
              borderRadius: 18,
              backgroundColor: BRAND_YELLOW,
              color: INK,
              fontSize: 40,
              fontWeight: 800,
              letterSpacing: -1,
            }}
          >
            SW
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 34,
              fontWeight: 700,
              color: "#ffffff",
              letterSpacing: -0.5,
            }}
          >
            Solar
            <span style={{ color: BRAND_YELLOW }}>Works</span>
          </div>
        </div>

        {/* Headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          <div
            style={{
              display: "flex",
              fontSize: 76,
              fontWeight: 800,
              color: "#ffffff",
              letterSpacing: -2,
              lineHeight: 1.05,
              maxWidth: 940,
            }}
          >
            {siteConfig.tagline}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 30,
              color: MUTED,
              lineHeight: 1.35,
              maxWidth: 900,
            }}
          >
            Personalized system design, professional installation, and lifetime
            support for homes and businesses going solar.
          </div>
        </div>

        {/* Footer strip */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 26,
            color: MUTED,
          }}
        >
          <div style={{ display: "flex", width: 44, height: 6, borderRadius: 999, backgroundColor: BRAND_YELLOW }} />
          <div style={{ display: "flex" }}>solarworks.ph · Batangas · Laguna · Cavite · Metro Manila</div>
        </div>
      </div>
    ),
    { ...size },
  )
}
