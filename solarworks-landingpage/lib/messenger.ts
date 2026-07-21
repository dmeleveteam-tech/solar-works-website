// Public Facebook Page ID — safe to expose, used only to build an m.me deep
// link. Leave unset to hide the "Continue on Messenger" shortcut.
const FB_PAGE_ID = process.env.NEXT_PUBLIC_FB_PAGE_ID

export const MESSENGER_HREF = FB_PAGE_ID ? `https://m.me/${FB_PAGE_ID}?ref=web_lead` : null
