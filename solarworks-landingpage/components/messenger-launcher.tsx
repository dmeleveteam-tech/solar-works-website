import { MessageCircle } from "lucide-react"

import { MESSENGER_GRADIENT, MessengerIcon } from "@/components/brand-icons"
import { siteConfig } from "@/lib/site-config"
import { MESSENGER_CHAT_HREF } from "@/lib/messenger"
import { Button } from "@/components/ui/button"

/**
 * Floating "chat with us" button on every public page. We used to run our own
 * AI widget here; the conversation now happens in Messenger itself, where the
 * platform's webhook owns qualification and the hand-off to a human.
 *
 * A plain link, not a click handler, so the browser's native behaviour just
 * works: an `m.me` link opens the Messenger app on mobile when it is installed
 * and falls back to web Messenger otherwise.
 *
 * It deep-links with `MESSENGER_CHAT_HREF` (`ref=web_chat`), NOT the
 * `MESSENGER_HREF` (`ref=web_lead`) used by the two lead forms. That
 * distinction is load-bearing: the webhook reads `web_lead` as "this person has
 * already sent us their details, greet them and fetch a human", so pointing a
 * cold-start button at it greets every visitor and then asks them nothing.
 *
 * Falls back to Viber when `NEXT_PUBLIC_FB_PAGE_ID` isn't configured, so the
 * button always does something rather than vanishing or pointing at a dead
 * `m.me` link — and the icon follows the destination, because a Messenger mark
 * that opens Viber is worse than no mark at all.
 *
 * No tracking code here on purpose: the delegated listener in
 * `components/analytics.tsx` already fires `messenger_click` for any `m.me`
 * href and `viber_click` for Viber, so both branches are covered.
 */
export function MessengerLauncher() {
  const messenger = Boolean(MESSENGER_CHAT_HREF)
  const href = MESSENGER_CHAT_HREF ?? siteConfig.contact.viber.href

  return (
    <Button
      asChild
      size="icon-lg"
      aria-label={messenger ? "Chat with us on Messenger" : "Chat with us on Viber"}
      // Messenger's gradient is an inline style rather than a utility because it
      // is a fixed brand asset, not a themeable colour — it must not shift with
      // our palette or invert in dark mode. On the Viber fallback we drop it and
      // let the button keep its own brand colour instead of wearing Messenger's.
      style={messenger ? { backgroundImage: MESSENGER_GRADIENT } : undefined}
      className={
        messenger
          ? "fixed right-4 bottom-24 z-50 size-14 rounded-full text-white shadow-lg transition hover:bg-transparent hover:-translate-y-0.5 hover:shadow-xl motion-reduce:transition-none motion-reduce:hover:translate-y-0 lg:bottom-6"
          : "fixed right-4 bottom-24 z-50 size-14 rounded-full shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl motion-reduce:transition-none motion-reduce:hover:translate-y-0 lg:bottom-6"
      }
    >
      <a href={href} target="_blank" rel="noopener noreferrer">
        {messenger ? <MessengerIcon className="size-7" /> : <MessageCircle className="size-5" />}
      </a>
    </Button>
  )
}
