import "server-only"

/**
 * Facebook Messenger Send API — used to message a website visitor who opted
 * in via the "Send to Messenger" button (see app/api/facebook/webhook).
 * Requires FB_PAGE_ACCESS_TOKEN, generated in the Meta Developer console
 * under the linked Page's Messenger settings.
 */

const PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN
const GRAPH_URL = "https://graph.facebook.com/v21.0/me/messages"

export function messengerConfigured(): boolean {
  return Boolean(PAGE_ACCESS_TOKEN)
}

/** Send a text message to a Messenger user by their page-scoped ID (PSID). */
export async function sendMessengerMessage(
  psid: string,
  text: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!PAGE_ACCESS_TOKEN) {
    return { ok: false, error: "FB_PAGE_ACCESS_TOKEN is not configured." }
  }

  try {
    const res = await fetch(`${GRAPH_URL}?access_token=${encodeURIComponent(PAGE_ACCESS_TOKEN)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        recipient: { id: psid },
        message: { text },
        messaging_type: "MESSAGE_TAG",
        tag: "CONFIRMED_EVENT_UPDATE",
      }),
      cache: "no-store",
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => "")
      console.error(`[facebook] send failed ${res.status}: ${detail}`)
      return { ok: false, error: `Messenger send failed (${res.status}).` }
    }
    return { ok: true }
  } catch (err) {
    console.error("[facebook] send error:", err)
    return { ok: false, error: "Messenger send threw an error." }
  }
}
