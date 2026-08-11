"use client"

import { Button } from "@/components/ui/button"
import { MessengerIcon } from "@/components/brand-icons"
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
      className="fixed right-4 bottom-24 z-50 size-14 rounded-full shadow-lg lg:bottom-6"
    >
      <a
        href={MESSENGER_CHAT_HREF}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with us on Messenger"
        onClick={() => track(ANALYTICS_EVENTS.messengerOpen)}
      >
        <MessengerIcon className="size-6" />
      </a>
    </Button>
  )
}
