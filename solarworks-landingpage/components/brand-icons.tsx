import type { SVGProps } from "react"

/**
 * Minimal brand glyphs. Lucide removed trademarked brand logos in v1, so we
 * inline simple, recognizable paths here.
 */
export function FacebookIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
      <path d="M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.9h-2.34V22c4.78-.79 8.44-4.94 8.44-9.94Z" />
    </svg>
  )
}

/**
 * Messenger's lightning-bolt-in-a-speech-bubble mark. The bubble's tail sits at
 * the lower left, which is why the glyph is not vertically centred in the box.
 *
 * `fillRule="evenodd"` is load-bearing, not decoration. The bolt is a second
 * subpath inside the bubble, and under the default nonzero rule it fills in the
 * same colour as the bubble and disappears — you get a solid blob. Even-odd
 * makes it the knockout it is meant to be, in every renderer, regardless of how
 * the subpath happens to be wound.
 */
export function MessengerIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" fillRule="evenodd" aria-hidden {...props}>
      <path d="M0 11.64C0 4.95 5.24 0 12 0s12 4.95 12 11.64c0 6.69-5.24 11.64-12 11.64-1.21 0-2.38-.16-3.47-.46a.96.96 0 0 0-.64.05l-2.39 1.05a.96.96 0 0 1-1.35-.85l-.07-2.14a.97.97 0 0 0-.32-.68A11.39 11.39 0 0 1 0 11.64Zm8.32-2.19-3.52 5.6c-.35.53.32 1.14.82.75l3.79-2.87c.26-.2.6-.2.87 0l2.8 2.1c.84.63 2.04.4 2.6-.48l3.52-5.6c.35-.53-.32-1.13-.82-.75l-3.79 2.87c-.25.2-.6.2-.86 0l-2.8-2.1a1.8 1.8 0 0 0-2.61.48Z" />
    </svg>
  )
}

/**
 * Messenger's official brand gradient, bottom-left to top-right: orange into
 * pink into purple into blue. Kept here beside the glyph because the two are
 * only ever correct together — the mark on a brand-coloured button reads as
 * "some chat app", whereas this pairing is recognised instantly and is what
 * makes the floating button worth tapping.
 */
export const MESSENGER_GRADIENT =
  "linear-gradient(45deg, #FF6960 0%, #FF5280 22%, #A033FF 55%, #0695FF 100%)"

export function InstagramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}
