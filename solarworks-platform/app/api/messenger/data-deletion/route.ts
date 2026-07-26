import { createHash } from "node:crypto"

import { NextResponse } from "next/server"

import { env, messengerEnabled } from "@/lib/env"
import { parseSignedRequest } from "@/lib/messenger/signed-request"
import { deleteSession } from "@/lib/messenger/sessions"

/**
 * Meta's Data Deletion Request callback.
 *
 * MANDATORY for App Review: the bot stores conversation transcripts keyed by
 * PSID in `messenger_sessions`, and Meta will not approve an app that holds user
 * data with no way for a user to demand its erasure. This is the endpoint whose
 * URL goes in App Settings → Basic → "Data Deletion Request URL".
 *
 * Three things make this different from the webhook next door:
 *
 *  1. The signature scheme is `signed_request`, NOT `X-Hub-Signature-256`. See
 *     `lib/messenger/signed-request.ts` for why they cannot share code.
 *  2. The body is form-encoded (`application/x-www-form-urlencoded`) with a
 *     single `signed_request` field — not JSON.
 *  3. Meta requires a specific JSON response shape, `{ url, confirmation_code }`,
 *     where `url` is a page a human can visit to check the status. Returning a
 *     bare 200 fails validation.
 *
 * Unlike the webhook, this endpoint DOES reject bad input with a 4xx. The
 * webhook's always-200 rule exists because Meta retries deliveries aggressively
 * and a retry storm creates duplicate leads; there is no such hazard here, and a
 * silent 200 on an unverified request would tell Meta a deletion happened when
 * it did not.
 */

export const runtime = "nodejs"

/**
 * A deterministic, non-reversible handle for the request.
 *
 * Meta shows this code to the user and we may be asked to correlate it later, so
 * it must be stable for a given PSID. It must NOT be the PSID itself: the
 * confirmation code is surfaced in Meta's UI and can end up in support threads
 * and screenshots, and a raw PSID there is an identifier leak. Hashing with the
 * app secret makes it opaque to anyone without it while staying reproducible for
 * us.
 */
function confirmationCode(psid: string): string {
  return createHash("sha256")
    .update(`${env.FB_APP_SECRET ?? ""}:${psid}`)
    .digest("hex")
    .slice(0, 16)
}

/** Absolute base URL of this app, for the status link Meta requires. */
function baseUrl(): string {
  return (env.APP_URL ?? env.BETTER_AUTH_URL).replace(/\/$/, "")
}

export async function POST(req: Request) {
  if (!messengerEnabled) {
    // Nothing is configured, so nothing was ever stored through this app.
    return NextResponse.json({ error: "Messenger is not configured." }, { status: 403 })
  }

  let signedRequest: string | null = null
  try {
    // Meta form-encodes this callback. Reading it as JSON throws and would look
    // like a malformed request from our side.
    const form = await req.formData()
    const value = form.get("signed_request")
    signedRequest = typeof value === "string" ? value : null
  } catch {
    return NextResponse.json({ error: "Expected form-encoded body." }, { status: 400 })
  }

  const payload = parseSignedRequest(signedRequest, env.FB_APP_SECRET)
  if (!payload?.user_id) {
    // Malformed, wrong algorithm, or a bad signature — all indistinguishable to
    // the caller on purpose. Acting on an unverified request would let anyone
    // erase another person's conversation by guessing a PSID.
    console.warn("[messenger] data deletion rejected: signed_request did not verify")
    return NextResponse.json({ error: "Invalid signed_request." }, { status: 403 })
  }

  const psid = payload.user_id
  const code = confirmationCode(psid)

  try {
    const existed = await deleteSession(psid)
    console.log(
      `[messenger] data deletion completed: psid=${psid} existed=${existed} code=${code}`,
    )
  } catch (err) {
    // Let this one surface. Reporting a deletion we could not perform is worse
    // than a 500 Meta will retry — the user would be told their data is gone
    // while it is still in the database.
    console.error("[messenger] data deletion failed:", err)
    return NextResponse.json({ error: "Deletion failed." }, { status: 500 })
  }

  return NextResponse.json({
    url: `${baseUrl()}/api/messenger/data-deletion?code=${code}`,
    confirmation_code: code,
  })
}

/**
 * The human-readable status page Meta links to with the confirmation code.
 *
 * Deliberately does not look the code up. It is a hash of a PSID we have just
 * erased, so there is nothing left to query — and keeping a record of "this PSID
 * asked to be forgotten" in order to answer status checks would undercut the
 * deletion itself. A completed request is simply final.
 */
export async function GET(req: Request) {
  const code = new URL(req.url).searchParams.get("code")

  if (!code) {
    return NextResponse.json(
      {
        status: "ready",
        detail:
          "Data deletion endpoint for the Solar Works Messenger assistant. Submit deletion requests through Facebook.",
      },
      { status: 200 },
    )
  }

  return new NextResponse(
    `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Data deletion — Solar Works</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 34rem; margin: 4rem auto; padding: 0 1.5rem; line-height: 1.6; color: #1a1a1a; }
    code { background: #f2f2f2; padding: .15rem .4rem; border-radius: .25rem; }
    @media (prefers-color-scheme: dark) { body { background: #111; color: #eee; } code { background: #262626; } }
  </style>
</head>
<body>
  <h1>Your data has been deleted</h1>
  <p>
    The Solar Works Messenger assistant has erased the conversation history,
    consent record and attribution data associated with your Messenger account.
  </p>
  <p>Confirmation code: <code>${code.replace(/[^a-f0-9]/gi, "").slice(0, 32)}</code></p>
  <p>
    Enquiries you explicitly consented to submit are kept as business records
    under our privacy policy. To have those removed as well, email
    <a href="mailto:hello@solarworks.ph">hello@solarworks.ph</a>.
  </p>
</body>
</html>`,
    { status: 200, headers: { "content-type": "text/html; charset=utf-8" } },
  )
}
