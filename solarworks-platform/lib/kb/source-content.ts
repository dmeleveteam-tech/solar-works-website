/**
 * Approved knowledge-base source content for the Solar Assistant chatbot (RAG).
 *
 * Pure data — no `server-only` — so both the Next.js server and the standalone
 * `seed-kb` node script can import it.
 *
 * This is the "approved knowledge base" the build guide keeps referencing —
 * the single reviewed artifact the chatbot is allowed to answer from. Each entry
 * is ONE self-contained, answerable idea (~50–200 words), not a page. The
 * ingestion script (`scripts/seed-kb.ts`) embeds each `content` string and
 * upserts it into the `kb_chunks` collection keyed by `chunkId`, so editing the
 * text here and re-running the seed updates that chunk in place.
 *
 * SOURCES (verbatim / lightly self-contained from approved copy):
 *   - FAQs .............. solarworks-landingpage/lib/content/site-content.ts
 *   - Solutions ......... solarworks-landingpage/lib/content/solutions.ts
 *   - Warranties ........ site-config warranties (20y panel / 10y battery / lifetime support)
 *   - Policy/guardrail .. build guide §8.3 (why we don't give instant quotes)
 *
 * NOT approved-solo: this file is the draft for Solar Works to review and sign
 * off. Expand toward ~20–40 chunks as more approved copy is confirmed (process
 * steps, net-metering detail, per-audience solution notes, service areas).
 */

export type KbCategory =
  | "faq-cost"
  | "faq-savings"
  | "faq-timeline"
  | "faq-net-metering"
  | "solution-grid-tied"
  | "solution-hybrid"
  | "solution-commercial"
  | "solution-carport"
  | "warranty"
  | "battery"
  | "policy"

export type KbSourceChunk = {
  /** Stable id — used as the upsert key. Never reuse across different ideas. */
  chunkId: string
  category: KbCategory
  /** The answerable question this chunk resolves (helps retrieval + admin review). */
  question: string
  /** Self-contained answer text that gets embedded and, on a match, handed to the model. */
  content: string
}

export const KB_SOURCE_CHUNKS: KbSourceChunk[] = [
  // --- Cost & savings -------------------------------------------------------
  {
    chunkId: "faq-cost-basics",
    category: "faq-cost",
    question: "How much does a solar system cost?",
    content:
      "The cost of a solar system depends on your electricity consumption, your roof, and whether you need battery backup. Solar Works does not quote a fixed price up front. After a quick assessment we give you a clear, itemized proposal with no obligation and no surprise costs.",
  },
  {
    chunkId: "faq-savings-basis",
    category: "faq-savings",
    question: "How much can I really save?",
    content:
      "Savings depend on your usage pattern and the size of the system. Rather than promise a fixed number, Solar Works models your actual electricity bill, so the savings projection you see is grounded in your real consumption instead of a generic estimate.",
  },

  // --- Timeline & process ---------------------------------------------------
  {
    chunkId: "faq-install-timeline",
    category: "faq-timeline",
    question: "How long does installation take?",
    content:
      "Most residential installations are completed within a few days once the design is approved and the materials are on site. The exact timeline for your project is confirmed in your proposal, since it depends on system size and site conditions.",
  },
  {
    chunkId: "faq-net-metering",
    category: "faq-net-metering",
    question: "What is net metering and do you handle it?",
    content:
      "Net metering lets a grid-tied system export surplus daytime energy back to the utility in exchange for credits on your bill. Solar Works handles the net-metering application and documentation as part of the project, so you don't have to manage the paperwork yourself.",
  },

  // --- Solutions ------------------------------------------------------------
  {
    chunkId: "solution-grid-tied",
    category: "solution-grid-tied",
    question: "What is grid-tied solar and who is it for?",
    content:
      "Grid-tied solar is the most cost-effective way to cut your electricity bill, best suited to homes with stable grid power that mainly want lower bills. Your panels offset daytime consumption and feed surplus energy back to the grid. It has the lowest upfront cost per kW, the fastest payback period, and is net-metering ready. It does not provide backup power during outages.",
  },
  {
    chunkId: "solution-hybrid",
    category: "solution-hybrid",
    question: "What is a hybrid system with battery?",
    content:
      "A hybrid system combines solar panels with battery storage, best for homes that need backup power during outages. You keep the lights on when the grid goes down and store cheap daytime energy to use after sunset, with smart prioritization of important loads. It costs more than grid-tied because of the battery, but it adds resilience during brownouts.",
  },
  {
    chunkId: "solution-commercial",
    category: "solution-commercial",
    question: "Do you serve businesses, farms, resorts, and schools?",
    content:
      "Yes. Solar Works designs commercial, farm, and carport systems for resorts, schools, farms, and SMEs looking to cut operating costs. The system is engineered around your operational load profile and can be mounted on the roof, on the ground, or as a carport, delivering a measurable reduction in one of the largest controllable costs in your business while strengthening energy resilience.",
  },
  {
    chunkId: "solution-carport",
    category: "solution-carport",
    question: "What is a solar carport?",
    content:
      "A solar carport turns unused parking into a power plant: one structure that generates clean energy, shades vehicles, and is ready for EV charging. It needs no roof space, making it a good fit for properties that want generation plus shade and EV-ready parking.",
  },

  // --- Warranties & battery -------------------------------------------------
  {
    chunkId: "warranty-coverage",
    category: "warranty",
    question: "What warranties do you offer?",
    content:
      "Solar Works panels carry a 20-year warranty and batteries carry a 10-year warranty. You also get lifetime after-sales support for as long as your products are under warranty.",
  },
  {
    chunkId: "battery-need",
    category: "battery",
    question: "Do I need a battery?",
    content:
      "Not always. If your goal is simply a lower bill and your grid supply is stable, a grid-tied system is the most cost-effective option and a battery is not required. If you experience frequent brownouts, a hybrid system with a battery keeps you powered during outages.",
  },

  // --- Policy / guardrails (build guide §8.3) -------------------------------
  {
    chunkId: "policy-no-instant-quote",
    category: "policy",
    question: "Why can't you give me an exact price or guaranteed savings right now?",
    content:
      "Solar Works does not give binding quotations, guaranteed savings figures, or definitive roof-suitability calls over chat, because pricing and savings depend on your consumption, site conditions, roof, and battery needs. Instead we arrange a proper assessment and then give you an itemized proposal grounded in your real usage. An adviser can confirm the specifics for your property.",
  },
]
