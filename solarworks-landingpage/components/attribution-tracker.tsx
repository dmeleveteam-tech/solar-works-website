"use client"

import * as React from "react"

import { captureAttribution } from "@/lib/attribution"

/**
 * Captures first-touch UTM + landing-page attribution on first load (L-04).
 * Renders nothing; mounted once in the root layout so the entry URL is read
 * before any client-side navigation strips its query string.
 */
export function AttributionTracker() {
  React.useEffect(() => {
    captureAttribution()
  }, [])
  return null
}
