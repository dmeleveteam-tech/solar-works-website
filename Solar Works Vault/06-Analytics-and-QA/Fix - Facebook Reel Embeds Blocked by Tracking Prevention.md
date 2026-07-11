---
title: Fix - Facebook Reel Embeds Blocked by Tracking Prevention
type: qa-fix
tags: [solar-works, qa, bugfix, landing, testimonials, video]
app: solarworks-landingpage
created: 2026-07-01
status: fixed
---

# Fix — Facebook Reel Embeds Blocked by Tracking Prevention

## Symptom

Visitors on Microsoft Edge saw the interstitial "This page has been blocked by Microsoft Edge" where a customer video should be, and the browser console reported: "Tracking Prevention blocked an IFrame resource from loading https://www.facebook.com/plugins/video.php?...". It affected three places on the marketing site.

## Cause

The reels were embedded as live iframes pointing at Facebook's video plugin (`https://www.facebook.com/plugins/video.php?...`). Microsoft Edge ships Tracking Prevention turned on by default (Balanced), and it blocks facebook.com social-plugin content when it loads inside a third-party frame. When Edge blocks the frame it replaces it with its own "This page has been blocked" screen. Chrome and Firefox do the same when strict privacy settings or an ad blocker are on. The YouTube testimonials were never affected because they use `youtube-nocookie.com`, which is not on the tracker lists.

Facebook does not offer an un-tracked embed (there is no Facebook equivalent of YouTube's nocookie domain), so an inline Facebook player is not reliable for a public audience.

## Fix applied (2026-07-01)

All three Facebook reels now link out to the reel on Facebook (opens in a new tab) instead of embedding the plugin. Because nothing is framed, tracking prevention has nothing to block.

The two testimonial reels on the customer-stories / stories-explorer flow use the supplied thumbnail images (`public/images/testimonials/fb-reel-thumb.png` and `fb-reel-thumb-2.png`) as a click-to-watch card, sharing one `CardFace` with the YouTube testimonial cards so they look identical. The YouTube cards keep their in-dialog nocookie player. The why-solar-works hero reel, which had no thumbnail, became an on-brand click-to-watch poster with a play button and a "Watch our customer reel on Facebook" label.

Files: `components/video-testimonial-card.tsx`, `lib/content/testimonials.ts` (field renamed `facebookEmbedUrl` to `facebookUrl` holding the public reel URL), and `app/why-solar-works/page.tsx`. Commits on branch `phase-1-launch-qa`: link-out for testimonials, then link-out for the hero.

## Decision (2026-07-01)

For now we keep the click-to-watch posters. The client chose this over the two ways to get true on-page playback, both of which need an asset we do not have yet.

## Open follow-up — inline autoplay (deferred)

If Solar Works later wants a reel to autoplay on the page without leaving it, the Facebook embed cannot do it (it is the thing being blocked). The reliable routes are:

The recommended route is to self-host the reel as an MP4. Solar Works owns the reels, so they can export the MP4 files; drop them in `solarworks-landingpage/public/videos/` and swap the hero poster for a native `<video autoplay muted loop playsinline>` with a tap-to-unmute control. Browsers only permit autoplay when the video is muted, which is a browser rule and not a Facebook one. The alternative is to re-upload the reel to YouTube as unlisted and embed it via `youtube-nocookie.com` with muted autoplay, at the cost of the video living on YouTube.

Note that the testimonial cards should stay click-to-play regardless, because QA-01 requires no intrusive autoplay there. Muted autoplay is only being considered for the single hero reel.

## Related

- [[Pre-Launch QA Checklist]]
- [[Spec Alignment Audit]]
