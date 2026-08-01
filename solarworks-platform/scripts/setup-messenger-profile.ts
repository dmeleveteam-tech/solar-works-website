import "dotenv/config"

import {
  MENU_TITLES,
  PERSISTENT_MENU_MAX,
  messengerProfilePayload,
} from "../lib/messenger/menu"
import {
  applyMessengerProfile,
  clearMessengerProfile,
  readMessengerProfile,
} from "../lib/messenger/profile"
import { TITLE_MAX } from "../lib/messenger/render"

/**
 * Push the Get Started button, greeting and persistent menu to the Page.
 *
 * Meta stores these against the PAGE, not against our deploy, so editing
 * `lib/messenger/menu.ts` changes nothing for visitors until this runs. Run it
 * after any menu copy change, and once when pointing the bot at a new Page.
 *
 *   pnpm messenger:profile          apply and verify
 *   pnpm messenger:profile --show   read back what Meta currently holds
 *   pnpm messenger:profile --clear  remove it (retiring the bot / changing Page)
 *
 * Reads `process.env` after `dotenv/config` rather than importing `lib/env`,
 * which is `server-only` and throws under tsx — the same pattern as every other
 * script here.
 */

const args = new Set(process.argv.slice(2))

// MARKETING_SITE_URL is deliberately NOT read here any more. Nothing in the Page
// profile embeds it since "Visit our website" left the persistent menu, and
// reading it would imply this script has to be re-run when the marketing domain
// changes — it does not. `workAndPricingText` picks the URL up at request time.
const TOKEN = process.env.FB_PAGE_ACCESS_TOKEN

async function main(): Promise<void> {
  if (!TOKEN) {
    throw new Error(
      "FB_PAGE_ACCESS_TOKEN is not set in .env — the Messenger profile cannot be applied.",
    )
  }

  if (args.has("--show")) {
    console.log(JSON.stringify(await readMessengerProfile(TOKEN), null, 2))
    return
  }

  if (args.has("--clear")) {
    console.log(JSON.stringify(await clearMessengerProfile(TOKEN), null, 2))
    console.log("Messenger profile cleared.")
    return
  }

  // Validate before sending: Meta rejects the WHOLE profile update when one
  // title is too long, and its error does not name the offending item.
  const actions = messengerProfilePayload().persistent_menu[0].call_to_actions

  if (actions.length > PERSISTENT_MENU_MAX) {
    throw new Error(
      `Persistent menu has ${actions.length} items; Meta allows ${PERSISTENT_MENU_MAX}.`,
    )
  }
  for (const action of actions) {
    if (action.title.length > TITLE_MAX) {
      throw new Error(
        `Menu title "${action.title}" is ${action.title.length} chars; the cap is ${TITLE_MAX}.`,
      )
    }
  }

  await applyMessengerProfile(TOKEN)

  // Read back rather than trusting the write: Meta returns success for a POST
  // whose persistent_menu it then declines to surface.
  console.log("Applied Messenger profile:\n")
  console.log(JSON.stringify(await readMessengerProfile(TOKEN), null, 2))
  console.log(
    `\nMenu items: ${Object.values(MENU_TITLES).join(" · ")}` +
      `\n\nOpen the Page in Messenger and confirm the hamburger menu shows all of them.`,
  )
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
