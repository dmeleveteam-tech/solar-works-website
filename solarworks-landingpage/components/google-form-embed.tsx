"use client"

import * as React from "react"
import { Loader2, ExternalLink } from "lucide-react"

// Our own Form, owned by dmeleve.team@gmail.com and bridged to /api/leads by
// `google-form/lead-bridge.gs`. The Form this replaced was owned by an account
// we don't control, so its submissions could never become leads.
const GOOGLE_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSfiwCR-yK7djNaPJ7BbhfhXJlCyb399237QWWFFFJFpa1DV6w/viewform?embedded=true"

const GOOGLE_FORM_LINK =
  "https://docs.google.com/forms/d/e/1FAIpQLSfiwCR-yK7djNaPJ7BbhfhXJlCyb399237QWWFFFJFpa1DV6w/viewform"

export function GoogleFormEmbed() {
  const [loaded, setLoaded] = React.useState(false)

  return (
    <div className="relative overflow-hidden rounded-2xl border bg-card shadow-sm">
      {/* Header bar */}
      <div className="flex items-center gap-3 border-b bg-primary/5 px-6 py-4">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
          {/* Sun icon inline so we don't need an extra import */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
          </svg>
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight">Solar Works — Inquiry Form</p>
          <p className="text-xs text-muted-foreground">
            Fill in your details and we&apos;ll reach out with a free assessment.
          </p>
        </div>
        <a
          href={GOOGLE_FORM_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto flex shrink-0 items-center gap-1 rounded-md px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          title="Open in new tab"
        >
          <ExternalLink className="size-3.5" />
          <span className="hidden sm:inline">Open full page</span>
        </a>
      </div>

      {/* Loading skeleton — hidden once iframe fires onLoad */}
      {!loaded && (
        <div className="absolute inset-x-0 bottom-0 top-[60px] flex flex-col items-center justify-center gap-3 bg-card">
          <Loader2 className="size-7 animate-spin text-primary/50" />
          <p className="text-xs text-muted-foreground">Loading inquiry form…</p>
        </div>
      )}

      {/* Google Form iframe */}
      <iframe
        src={GOOGLE_FORM_URL}
        title="Solar Works Inquiry Form"
        onLoad={() => setLoaded(true)}
        className="w-full transition-opacity duration-500"
        style={{
          height: "820px",
          border: "none",
          opacity: loaded ? 1 : 0,
        }}
        allowFullScreen
      />
    </div>
  )
}
