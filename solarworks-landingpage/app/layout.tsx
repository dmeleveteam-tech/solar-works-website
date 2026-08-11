import type { Metadata } from "next"
import { Geist_Mono, Manrope, Sora } from "next/font/google"

import "./globals.css"
import { cn } from "@/lib/utils"
import { siteConfig } from "@/lib/site-config"
import { ThemeProvider } from "@/components/theme-provider"
import { SmoothScroll } from "@/components/smooth-scroll"
import { SiteHeader } from "@/components/layout/site-header"
import { SiteFooter } from "@/components/layout/site-footer"
import { MobileCtaBar } from "@/components/layout/mobile-cta-bar"
import { MessengerLauncher } from "@/components/messenger-launcher"
import { ConsentBanner } from "@/components/consent-banner"
import { Analytics } from "@/components/analytics"
import { AttributionTracker } from "@/components/attribution-tracker"
import { Toaster } from "@/components/ui/sonner"

const manrope = Manrope({ subsets: ["latin"], variable: "--font-sans" })
const fontMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" })
// Tight grotesk for display headings; body stays Manrope.
const sora = Sora({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700", "800"],
})

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.name} — ${siteConfig.tagline}`,
    template: `%s — ${siteConfig.name}`,
  },
  description: siteConfig.description,
  openGraph: {
    title: `${siteConfig.name} — ${siteConfig.tagline}`,
    description: siteConfig.description,
    url: siteConfig.url,
    siteName: siteConfig.name,
    type: "website",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        manrope.variable,
        sora.variable,
      )}
    >
      <body>
        <ThemeProvider>
          <SmoothScroll />
          <div className="flex min-h-svh flex-col">
            <SiteHeader />
            {/* pb on mobile so the sticky CTA bar never overlaps content */}
            <main className="flex-1 pb-20 lg:pb-0">{children}</main>
            <SiteFooter />
          </div>
          <MobileCtaBar />
          <MessengerLauncher />
          <ConsentBanner />
          <Analytics />
          <AttributionTracker />
          <Toaster position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  )
}
