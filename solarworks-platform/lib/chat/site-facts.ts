/**
 * Company facts and static content the chat brain states in its system prompt.
 *
 * THIS IS A MIRROR. The originals are `solarworks-landingpage/lib/site-config.ts`
 * (brand, contact channels, warranties, service areas) and
 * `solarworks-landingpage/lib/content/site-content.ts` (`howItWorks`, and the
 * bundled `faqs` used as the CMS fallback). The brain moved into the platform,
 * but those files live in the marketing app and the two are independent pnpm
 * projects with no shared package — so the minimum the prompt needs is copied
 * here rather than fetched over HTTP on every turn.
 *
 * Only the values below are mirrored, deliberately: everything else in
 * `site-config.ts` is navigation and page copy the brain never reads. Keep the
 * phone/Viber numbers and warranty wording in step with the marketing site — the
 * assistant reads them out to visitors, and a stale number is a lost lead.
 *
 * FAQ content is NOT mirrored as the source of truth: the platform IS the CMS,
 * so `loadFaqs()` in `./brain` reads `listPublishedFaqs()` and only falls back to
 * `FALLBACK_FAQS` below when the CMS is empty or unreachable.
 *
 * No `server-only` and no imports — plain data, so the brain's pure helpers stay
 * unit-testable without a database.
 */

export const siteFacts = {
  name: "Solar Works",
  legalName: "Solar Works Energy Solutions",
  serviceAreas: ["Batangas", "Laguna", "Cavite", "Metro Manila", "Quezon"],
  warranties: {
    panel: "20-Year Panel Warranty",
    battery: "10-Year Battery Warranty",
    support: "Lifetime After-Sales Support",
  },
  contact: {
    phone: "+63 917 555 0142",
    whatsapp: "+63 917 555 0142",
    email: "hello@solarworks.ph",
  },
} as const

/** One step of the published "how it works" process, prompt-shaped. */
export type ProcessStep = { number: string; title: string; description: string }

/** Mirrors `howItWorks` from the marketing site, minus the Lucide icons. */
export const howItWorks: ProcessStep[] = [
  {
    number: "01",
    title: "Share your bill",
    description: "Tell us your monthly consumption or electricity bill. That's all we need to start.",
  },
  {
    number: "02",
    title: "Site & roof assessment",
    description: "We assess your roof, space, and load profile to confirm what's actually right for you.",
  },
  {
    number: "03",
    title: "System design + proposal",
    description: "You get a personalized design and a clear proposal — no jargon, no surprise costs.",
  },
  {
    number: "04",
    title: "Installation + support",
    description: "Our team installs cleanly and stays with you for the life of the warranty.",
  },
]

/**
 * Structurally compatible with the CMS's `PublicFaq`, so `loadFaqs()` can return
 * either without a mapping step. `category` is a plain string here on purpose —
 * the brain only groups by it, it never validates it.
 */
export type Faq = { question: string; answer: string; category: string }

/**
 * Used only when the CMS returns no published FAQs (fresh database, or a Mongo
 * outage). Without it the prompt's "What you know" section would be empty and
 * the assistant would defer every ordinary question to an adviser, which is the
 * exact behaviour the knowledge base exists to prevent.
 */
export const FALLBACK_FAQS: Faq[] = [
  {
    question: "How much does a solar system cost?",
    answer:
      "It depends on your consumption, roof, and whether you need battery backup. After a quick assessment we give you a clear, itemized proposal — no obligation and no surprise costs.",
    category: "Cost & Savings",
  },
  {
    question: "How much can I really save?",
    answer:
      "Savings depend on your usage pattern and system size. We model your actual bill rather than promise a fixed number, so the projection you see is grounded in your real consumption.",
    category: "Cost & Savings",
  },
  {
    question: "What warranties do you offer?",
    answer:
      "Panels carry a 20-year warranty and batteries a 10-year warranty, plus lifetime after-sales support while your products are under warranty.",
    category: "Warranties",
  },
  {
    question: "Do I need a battery?",
    answer:
      "Not always. If your goal is simply a lower bill and your grid is stable, grid-tied is the most cost-effective option. If you experience frequent brownouts, a hybrid system with battery keeps you powered.",
    category: "Battery",
  },
  {
    question: "How long does installation take?",
    answer:
      "Most residential installations are completed within a few days once the design is approved and materials are on site. We confirm the exact timeline in your proposal.",
    category: "Installation",
  },
  {
    question: "What is net metering?",
    answer:
      "Net metering lets a grid-tied system export surplus daytime energy back to the utility for credits. We handle the application and documentation as part of the project.",
    category: "General",
  },
]
