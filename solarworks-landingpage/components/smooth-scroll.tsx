"use client"

import * as React from "react"
import Lenis from "lenis"

/**
 * Buttery smooth-scroll via Lenis. Mounted once near the root.
 *
 * Honors prefers-reduced-motion: when the user opts out of motion we don't
 * initialize Lenis at all, leaving the browser's native (instant) scrolling in
 * place. Cleans up its rAF loop and instance on unmount.
 */
export function SmoothScroll() {
  React.useEffect(() => {
    if (typeof window === "undefined") return
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)")
    if (mql.matches) return

    const lenis = new Lenis({
      // Gentle, not floaty — short duration with a strong ease-out (Emil curve).
      duration: 1.05,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    })

    let frame = 0
    const raf = (time: number) => {
      lenis.raf(time)
      frame = requestAnimationFrame(raf)
    }
    frame = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(frame)
      lenis.destroy()
    }
  }, [])

  return null
}
