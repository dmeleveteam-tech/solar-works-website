"use client"

import * as React from "react"

/**
 * Cookie/analytics consent, persisted in localStorage and exposed as an external
 * store via useSyncExternalStore. Analytics scripts load only when consent is
 * "granted" (see Privacy Notice + NFR). Until the visitor chooses, consent is
 * "unknown" and the banner is shown.
 *
 * No React Context/Provider is needed — every `useConsent()` caller subscribes
 * to the same store, so a grant/deny in the banner updates the analytics loader
 * in the same tick.
 */

export type ConsentState = "unknown" | "granted" | "denied"

const STORAGE_KEY = "sw-analytics-consent"

// In-tab subscribers. The native "storage" event only fires in *other* tabs, so
// we keep our own listener set and notify it on write.
const listeners = new Set<() => void>()

function notify() {
  for (const listener of listeners) listener()
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange)
  window.addEventListener("storage", onChange)
  return () => {
    listeners.delete(onChange)
    window.removeEventListener("storage", onChange)
  }
}

function readConsent(): ConsentState {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    return value === "granted" || value === "denied" ? value : "unknown"
  } catch {
    return "unknown"
  }
}

function writeConsent(value: Exclude<ConsentState, "unknown">) {
  try {
    window.localStorage.setItem(STORAGE_KEY, value)
  } catch {
    // Ignore persistence failures (e.g. private mode); the notify below still
    // applies the choice for this session.
  }
  notify()
}

type ConsentValue = {
  consent: ConsentState
  grant: () => void
  deny: () => void
}

export function useConsent(): ConsentValue {
  const consent = React.useSyncExternalStore(
    subscribe,
    readConsent,
    () => "unknown" as ConsentState,
  )
  return {
    consent,
    grant: () => writeConsent("granted"),
    deny: () => writeConsent("denied"),
  }
}

/**
 * True only after client hydration. Lets components avoid an SSR flash without
 * a setState-in-effect (the server snapshot is `false`, the client `true`).
 */
export function useHydrated(): boolean {
  return React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )
}
