---
title: Design System and Frontend Build
type: decision
tags: [solar-works, website, design-system, frontend, motion, decision]
source: "Design-system redesign session 2026-06-29"
created: 2026-06-29
status: in-progress
---

# Design System and Frontend Build

> [!info] Status
> Whole-site design-system redesign landed 2026-06-29 in `website/`. Build, lint, and typecheck all green (10 routes). This note is the source of truth for the visual system and frontend motion. Update as it evolves. See [[Tech Stack and Architecture]] for the platform layer.

## What this was

Re-skinned the entire marketing site to a modern, light SaaS-landing aesthetic, using a supplied Framer AI brief as a **pattern only** (not literal — the brief was for an AI assistant; we kept honest solar content). Reinforces premium/accessible UI ([[Non-Functional Requirements\|NFR-04]]) and keeps the performance posture ([[Non-Functional Requirements\|NFR-01]]).

## Decisions

| Area | Decision | Why |
|---|---|---|
| Accent color | **Kept yellow/amber** (`--primary`); ignored the brief's red/coral | Solar brand identity. Yellow buttons keep dark text for AA contrast. |
| Logo | **Wordmark "Solar Works"** + one small amber node dot — no sun icon | Per direction; cleaner, more brandable. |
| Type | Body **Manrope**; display headings **Sora** (`font-heading`) | Tight bold display headings vs restrained body, per brief. |
| Heading style | `.text-display`, `.section-label` (uppercase), `.word-soft` / `.word-outline` | "Some words lighter/outline" + small uppercase labels. |
| Motion | **Lenis** smooth-scroll + **Framer Motion**; signature `PathGraphic` line-art "energy path" | Premium feel; all gated on `prefers-reduced-motion` (a11y). Applied the `emil-design-eng` principles (gentle, short, ease-out). |
| Layout width | Container `max-w-[96rem]`, trimmed gutters | Client asked for a wide layout / small margins. |
| Pricing | **Honest "packages", no fixed $** — Residential/Commercial toggle, "Custom quote" cards | Solar is custom-quoted; avoids fabricated prices. |
| Scrollbar | Thin, theme-aligned, gated to `(pointer: fine)` | Styled on desktop; native overlay kept on touch. |

## Homepage section flow

Hero (monitoring-panel + floating stat chips, a nod to the reference app) → Tier-1 logo cloud → 3 feature cards w/ mini mockups → capability grid → alternating solution showcase → testimonial carousel (client selector + arrows) → "what you get" 2×3 → packages (toggle) → CTA band → footer (giant faded wordmark + newsletter). See [[Page - Home]].

## Key files

- Tokens / fonts / scrollbar: `website/app/globals.css`, `website/app/layout.tsx`
- Motion: `components/smooth-scroll.tsx`, `components/reveal.tsx` (rewritten on Framer Motion, **same API**), `components/path-graphic.tsx`
- Primitives: `components/logo.tsx`, `components/section.tsx`, `components/page-hero.tsx`, `components/ui/{button,card}.tsx`
- Homepage sections: `components/sections/{hero-visual,testimonial-carousel,packages,cta-band}.tsx`
- Chrome: `components/layout/{site-header,site-footer}.tsx`, `components/newsletter-signup.tsx`

## Open follow-ups

- [ ] Swap placeholder Tier-1 brand wordmarks for real partner logos (greyscale).
- [ ] Wire the **newsletter signup** to a provider (currently client-validates + toasts only; `// TODO` in `newsletter-signup.tsx`).
- [ ] Optional: deeper section-level rework of inner-page bodies (they currently inherit the new system rather than being re-composed).
- [ ] Confirm warranty/claims language ("up to 70%" hero stat) with approved copy ([[Project Scope]]).

## Related

- [[Tech Stack and Architecture]] · [[Page - Home]]
- [[Non-Functional Requirements]] · [[Global Requirements]]
