"use client"

import { Button } from "@/components/ui/button"
import { MESSENGER_GRADIENT, MessengerIcon } from "@/components/brand-icons"
import { ANALYTICS_EVENTS, track } from "@/lib/analytics"
import { MESSENGER_CHAT_HREF } from "@/lib/messenger"

/**
 * Floating "chat with us" button. We used to run our own AI widget here; the
 * conversation now happens in Messenger itself, where the platform's webhook
 * already owns qualification and hand-off. That means this component has one
 * job — open the thread — and nothing to say when the Page ID is missing, so
 * it renders nothing rather than a button that leads to a broken m.me link.
 */
export function MessengerLauncher() {
  if (!MESSENGER_CHAT_HREF) return null

  return (
    <Button
      asChild
      size="icon-lg"
      // The gradient is an inline style rather than a utility because it is a
      // fixed brand asset, not a themeable colour — it must not shift with our
      // palette or with dark mode. `hover:bg-transparent` stops the Button's own
      // hover colour painting over it; the lift and shadow carry the hover
      // instead, and both are dropped for reduced-motion.
      style={{ backgroundImage: MESSENGER_GRADIENT }}
      className="fixed right-4 bottom-24 z-50 size-14 rounded-full text-white shadow-lg transition hover:bg-transparent hover:-translate-y-0.5 hover:shadow-xl motion-reduce:transition-none motion-reduce:hover:translate-y-0 lg:bottom-6"
    >
      <a
        href={MESSENGER_CHAT_HREF}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with us on Messenger"
        onClick={() => track(ANALYTICS_EVENTS.messengerOpen)}
      >
        <MessengerIcon className="size-7" />
      </a>
    </Button>
  )
}
