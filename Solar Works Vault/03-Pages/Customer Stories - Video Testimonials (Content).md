---
title: Customer Stories - Video Testimonials (Content)
type: content
tags: [solar-works, website, testimonial, content, video]
source: "Solar Works (actual customer testimonials)"
---

# Customer Stories — Video Testimonials (Content)

Real, published customer video testimonials provided by Solar Works, captured against the [[Page - Customer Stories|T-02]] video-testimonial schema. These are the customers' actual stories on YouTube (public + consented per [[Non-Functional Requirements|NFR-03]] / T-05).

> [!info] Fields marked _confirm_ weren't provided — verify with Solar Works before publishing. No energy-savings figures are stated as guarantees (T-05).

## 1. Mr. Ric Corciga

- **Headline:** Why Going Solar Made Sense for Our Family Long-Term
- **Client name:** Mr. Ric Corciga
- **Location:** _confirm_
- **Project type:** _confirm_ (Residential / Grid-Tied / Hybrid?)
- **YouTube ID:** `Q7F2BEHBiQw`
- **Watch:** https://www.youtube.com/watch?v=Q7F2BEHBiQw
- **Embed:** `https://www.youtube.com/embed/Q7F2BEHBiQw`
- **Thumbnail:** https://img.youtube.com/vi/Q7F2BEHBiQw/hqdefault.jpg
- **Summary:** A family's perspective on the long-term value of going solar.
- **Consent status:** Public (customer testimonial published by Solar Works)
- **Publish status:** _confirm_

## 2. Ms. Zeny Raca

- **Headline:** From High Electric Bills to Big Savings
- **Client name:** Ms. Zeny Raca
- **Location:** _confirm_
- **Project type:** _confirm_ (Residential / Grid-Tied / Hybrid?)
- **YouTube ID:** `-l_882YKEPg`
- **Watch:** https://www.youtube.com/watch?v=-l_882YKEPg
- **Embed:** `https://www.youtube.com/embed/-l_882YKEPg`
- **Thumbnail:** https://img.youtube.com/vi/-l_882YKEPg/hqdefault.jpg
- **Summary:** A homeowner's story of moving from high electricity bills to meaningful savings with solar.
- **Consent status:** Public (customer testimonial published by Solar Works)
- **Publish status:** _confirm_

## Next steps

- [ ] Confirm each testimonial's location, system/project type, and any quotable outcome (no guaranteed-savings figures — T-05). Until confirmed, the site **omits** location and the system-type badge rather than guessing.
- [x] Load into the live site — done. These two are now the only video testimonials in `solarworks-landingpage/lib/content/testimonials.ts` (and the platform seed `solarworks-platform/scripts/seed-content.ts`). The card embeds the real YouTube video (`youtube-nocookie.com/embed/<id>`) and uses the YouTube thumbnail.

> [!note] Mock content removed (2026-06-30)
> The previous **mock** video + written testimonials were removed. There are currently **no written testimonials** (the array is empty and the homepage testimonial carousel was removed) — real written quotes go in once collected with consent. All **mock stock photos** site-wide (projects, solutions, learning-center, about, why-solar-works) were cleared; the `Photo` component now shows a **"SOLARWORK IMAGE TO BE PROVIDED"** placeholder wherever a real image is missing.

## Related

- [[Page - Customer Stories]]
- [[Page - Home]]
- [[Analytics and Conversion Events]] — `testimonial_video_play` fires when a visitor plays one of these.
