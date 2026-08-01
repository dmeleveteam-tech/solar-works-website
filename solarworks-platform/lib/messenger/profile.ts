import { messengerProfilePayload } from "./menu"

/**
 * Messenger Profile API — the Page-level settings that exist OUTSIDE any
 * conversation: the Get Started button, the greeting shown before the first
 * message, and the persistent (hamburger) menu.
 *
 * Unlike `send.ts` this is not called per turn. It is applied once by
 * `pnpm messenger:profile` and again whenever the menu copy changes, because
 * Meta stores the profile against the Page, not against our deploy. A code
 * change to `menu.ts` therefore does NOT reach visitors until the script runs —
 * that is the single most surprising thing about this file.
 *
 * The token is a PARAMETER, not an `env` import — the same reasoning as
 * `signed-request.ts`. `lib/env.ts` is `server-only`, which throws under tsx,
 * and every script in `scripts/` reads `process.env` after `dotenv/config`
 * instead. Taking it as an argument keeps this module usable from both worlds.
 *
 * These DO throw, unlike the send path. A profile update is an operator action
 * with a human watching the output; failing loudly is right, whereas failing
 * loudly mid-conversation would cost a lead.
 */

const PROFILE_URL = "https://graph.facebook.com/v21.0/me/messenger_profile"

function requireToken(token: string | undefined | null): string {
  if (!token) {
    throw new Error("FB_PAGE_ACCESS_TOKEN is not set — cannot update the Messenger profile.")
  }
  return token
}

async function call(
  token: string | undefined | null,
  method: "POST" | "DELETE",
  body: unknown,
): Promise<unknown> {
  const res = await fetch(
    `${PROFILE_URL}?access_token=${encodeURIComponent(requireToken(token))}`,
    {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    },
  )

  const text = await res.text()
  if (!res.ok) throw new Error(`Messenger profile ${method} failed ${res.status}: ${text}`)
  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

/**
 * Push Get Started, greeting and persistent menu to the Page.
 *
 * Took a `siteUrl` until the persistent menu's "Visit our website" item was
 * displaced by "Start over" (see `messengerProfilePayload`) — nothing in the
 * profile is site-dependent any more. The marketing URL still reaches visitors,
 * via `workAndPricingText` at runtime rather than baked into the Page profile.
 */
export function applyMessengerProfile(token: string | undefined | null): Promise<unknown> {
  return call(token, "POST", messengerProfilePayload())
}

/** Read back what Meta currently holds, so the script can verify rather than assume. */
export async function readMessengerProfile(token: string | undefined | null): Promise<unknown> {
  const fields = "get_started,greeting,persistent_menu"
  const res = await fetch(
    `${PROFILE_URL}?fields=${fields}&access_token=${encodeURIComponent(requireToken(token))}`,
    { cache: "no-store" },
  )
  const text = await res.text()
  if (!res.ok) throw new Error(`Messenger profile read failed ${res.status}: ${text}`)
  return JSON.parse(text) as unknown
}

/**
 * Remove the profile. Needed when retiring the bot or moving to a different
 * Page — a stale Get Started button on a Page whose webhook is gone leaves
 * visitors tapping a button that does nothing.
 */
export function clearMessengerProfile(token: string | undefined | null): Promise<unknown> {
  return call(token, "DELETE", { fields: ["get_started", "greeting", "persistent_menu"] })
}
