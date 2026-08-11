// Public Facebook Page ID — safe to expose, used only to build an m.me deep
// link. Leave unset to hide the "Continue on Messenger" shortcut.
const FB_PAGE_ID = process.env.NEXT_PUBLIC_FB_PAGE_ID

/**
 * Post-submission shortcut, offered only after someone has already handed us
 * their details. The `web_lead` ref is load-bearing: the platform webhook
 * special-cases it to mean "this person is already a lead", so the bot skips
 * qualification, greets them, and hands the thread straight to a human.
 */
export const MESSENGER_HREF = FB_PAGE_ID ? `https://m.me/${FB_PAGE_ID}?ref=web_lead` : null

/**
 * Cold-start shortcut for the floating launcher, where the visitor has told us
 * nothing yet. It deliberately carries a different ref — reusing `web_lead`
 * here would short-circuit the webhook into human hand-off and throw away the
 * qualification flow for someone we know nothing about. `web_chat` lets the bot
 * do its job and only escalate once it has something worth escalating.
 */
export const MESSENGER_CHAT_HREF = FB_PAGE_ID ? `https://m.me/${FB_PAGE_ID}?ref=web_chat` : null
