import { MessageCircle } from "lucide-react"

import { MESSENGER_HREF } from "@/lib/messenger"
import { siteConfig } from "@/lib/site-config"
import { Button } from "@/components/ui/button"

/**
 * Floating chat launcher on every public page. Used to open an in-site AI
 * widget backed by `/api/chat`; that widget (and its server-side brain proxy)
 * has been removed, and the button now hands visitors straight to Facebook
 * Messenger instead — a plain link, not a JS click handler, so the browser's
 * native behavior just works: an `m.me` link opens the Messenger app on
 * mobile when it's installed and falls back to web Messenger otherwise, and
 * `target="_blank"` opens the same web chat in a new tab on desktop.
 *
 * Falls back to the Viber contact link when `NEXT_PUBLIC_FB_PAGE_ID` isn't
 * configured, so the button always does something rather than pointing at a
 * dead `m.me` link. Clicks are tracked as `messenger_click` by the delegated
 * listener in `components/analytics.tsx` (it matches on the `m.me` href), so
 * no analytics code is needed here.
 */
export function ChatLauncher() {
  const href = MESSENGER_HREF ?? siteConfig.contact.viber.href
  const label = MESSENGER_HREF ? "Chat with us on Messenger" : "Chat with us on Viber"

  return (
    <Button
      asChild
      size="icon-lg"
      aria-label={label}
      className="fixed right-4 bottom-24 z-50 size-14 rounded-full shadow-lg lg:bottom-6"
    >
      <a href={href} target="_blank" rel="noopener noreferrer">
        <MessageCircle className="size-5" />
      </a>
    </Button>
  )
}
