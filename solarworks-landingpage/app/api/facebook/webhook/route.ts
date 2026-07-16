import { NextResponse } from "next/server"

import { sendMessengerMessage } from "@/lib/facebook"

/**
 * Facebook Messenger webhook — receives events from the m.me "Continue on
 * Messenger" link shown after a chatbot lead is saved (see chat-launcher.tsx
 * and app/api/chat/route.ts). When a visitor taps that link and sends the
 * pre-filled message, Meta POSTs a `messaging` event here carrying our
 * `ref` in `referral` (first contact) or `message.referral` (already a
 * contact). We reply immediately so a real Messenger thread exists for staff
 * to pick up — no separate database needed to correlate the two channels.
 * Verified with FB_WEBHOOK_VERIFY_TOKEN (set by us) on setup, then Meta POSTs
 * events here once the Page + webhook are subscribed in the Meta Developer
 * console.
 */

const VERIFY_TOKEN = process.env.FB_WEBHOOK_VERIFY_TOKEN
const WELCOME_MESSAGE =
  "Salamat sa pag-inquire sa Solar Works! Nakuha na namin ang mga detalye mo sa website. Dito mo na rin kami pwedeng tanungin — sasagutin ka ng team namin dito sa Messenger."

// Meta's subscription handshake: echo back the challenge if the token matches.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get("hub.mode")
  const token = searchParams.get("hub.verify_token")
  const challenge = searchParams.get("hub.challenge")

  if (mode === "subscribe" && token && VERIFY_TOKEN && token === VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 })
  }
  return NextResponse.json({ error: "Verification failed." }, { status: 403 })
}

type MessagingEntry = {
  sender?: { id?: string }
  optin?: { ref?: string; user_ref?: string }
  referral?: { ref?: string }
  message?: { text?: string; is_echo?: boolean; referral?: { ref?: string } }
}

export async function POST(req: Request) {
  let body: { entry?: { messaging?: MessagingEntry[] }[] }
  try {
    body = (await req.json()) as typeof body
  } catch {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 })
  }

  for (const entry of body.entry ?? []) {
    for (const event of entry.messaging ?? []) {
      const psid = event.sender?.id
      if (!psid || event.message?.is_echo) continue

      const ref = event.optin?.ref ?? event.referral?.ref ?? event.message?.referral?.ref
      if (ref === "web_lead") {
        // First contact from the "Continue on Messenger" link — reply so a
        // real thread exists in the Page inbox for staff to take over.
        console.log(`[facebook] web lead opened Messenger: psid=${psid}`)
        void sendMessengerMessage(psid, WELCOME_MESSAGE)
      }
    }
  }

  // Always 200 quickly — Meta retries aggressively on non-200 responses.
  return NextResponse.json({ received: true })
}
