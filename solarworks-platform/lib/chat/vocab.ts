/**
 * Canonical vocabulary for the Solar Assistant's structured input blocks.
 *
 * THIS IS THE ONLY COPY. It used to be mirrored by
 * `solarworks-landingpage/lib/chat-ui.ts`, which the marketing site's chat
 * widget rendered from; that widget has been replaced by a plain link into
 * Messenger and the mirror is gone, so there is no longer anything to keep in
 * sync. Messenger is the only channel that consumes this vocabulary.
 *
 * Design note: these blocks are an INPUT AFFORDANCE ONLY. Whatever the visitor
 * taps becomes an ordinary `role: "user"` text message before it reaches the
 * model, so the LLM's view of the conversation stays plain text and the whole
 * flow still works by typing if the model ignores these tools. That is what
 * lets Messenger use it at all: a quick-reply tap arrives as the same labelled
 * text a typed answer does.
 *
 * No `server-only` and no React import — plain data plus pure helpers.
 */

/**
 * RETIRED FROM THE ASKED FLOW, deliberately still defined.
 *
 * The qualification chat no longer asks for property type, preferred solution
 * or preferred contact method — they are not in `REQUIRED_FIELD_LABELS` and the
 * system prompt's step list does not mention them. They are kept here because
 * three other things still depend on the exact strings:
 *
 *  - the marketing site's lead form still collects all three and writes them to
 *    lead details under these same labels (`solarworks-landingpage`'s leads
 *    route), so the dashboard shows a mixed population and the spellings must
 *    not fork;
 *  - `save_lead`'s enums and `handleSaveLead`'s `putEnum` validate against these
 *    lists, which is what stops a hallucinated "Telegram" reaching a lead when
 *    a visitor volunteers something unprompted;
 *  - `lib/lead-intel.ts` scores "property type" and "preferred solution".
 *
 * Deleting them would silently zero those scoring signals and leave the form's
 * leads carrying labels nothing in this app recognises. Leaving them defined
 * but unasked costs nothing: the model only reaches for a choice field the
 * prompt tells it to.
 */
export const PROPERTY_TYPES = [
  "Home",
  "Farm",
  "Resort",
  "School",
  "Office",
  "Commercial",
  "Other",
] as const

export const SOLUTION_INTERESTS = [
  "Grid-Tied",
  "Hybrid with Battery",
  "Not Sure Yet",
  "Commercial Solar",
] as const

export const CONTACT_METHODS = ["Call", "Viber", "WhatsApp", "Email"] as const

/**
 * When during the day the site actually draws power.
 *
 * Asked because it is the single question that separates a plain grid-tied
 * array from one that needs storage, and it is a question the visitor can
 * answer without looking anything up — unlike kWh, which they cannot. A
 * daytime-heavy load is served by panels directly; a night-heavy one is not,
 * whatever the bill says.
 *
 * "Not sure" is here for the same reason it is in the bill brackets: without an
 * honest escape hatch the only way out of a question you cannot answer is to
 * abandon the flow.
 */
export const USAGE_PATTERNS = [
  "Mostly daytime",
  "Mostly night",
  "About even",
  "Not sure",
] as const

/**
 * What the visitor wants their electricity bill to do — phrased the way they
 * put it themselves, not in industry terms.
 *
 * These replaced an abstract list ("Lower my bill", "Backup power", "Both",
 * "Business operating cost", "Sustainability") that asked the visitor to
 * translate their situation into our vocabulary. A concrete target is both
 * easier to pick and far more useful to an adviser: "cut it by half" and "get
 * it to near zero" size two very different systems, and "fix brownout issues"
 * is a battery conversation rather than a savings one.
 *
 * Every string is ≤20 characters so it fits a Messenger quick-reply title with
 * no `SHORT_TITLES` override — the longest, "Fix brownout issues", is 19. See
 * the guard test in lib/messenger/render.test.ts before lengthening any of them.
 */
export const PRIMARY_GOALS = [
  "Cut bill by ~50%",
  "Near-zero bill",
  "Fix brownout issues",
  "All of these",
] as const

/**
 * Monthly electricity bill brackets, in PHP.
 *
 * Asked as a CHOICE rather than a number because most people do not know their
 * bill to the peso and, asked for an exact figure, either guess badly or drop
 * out of the flow. A bracket is both easier to answer honestly and entirely
 * sufficient for sizing — the adviser confirms the real figure from an actual
 * bill during the assessment.
 *
 * "Not sure" is deliberately last and deliberately present, and it matters more
 * now than it did: the bill IS in `REQUIRED_FIELD_LABELS`, so this is the only
 * answer that lets someone who genuinely doesn't know their bill past the first
 * question instead of abandoning the flow. Do not remove it.
 *
 * English like every other canonical option, even though the assistant mirrors
 * the visitor's language in prose. These strings are DATA, not conversation:
 * they are matched verbatim by `collectedFields`, stored on the lead, and read
 * by the sales team in the dashboard. A chip that changed language per visitor
 * would break the match and fill the dashboard with two spellings of the same
 * answer.
 *
 * Every title must survive Messenger's 20-character quick-reply cap — see the
 * guard test in lib/messenger/render.test.ts. The longest here is 17 — the peso
 * sign and the en-dash are multi-byte but count as one character each, so
 * "₱10,000 – ₱20,000" is nearer the cap than it looks.
 */
export const MONTHLY_BILL_RANGES = [
  "Below ₱3,000",
  "₱3,000 – ₱5,000",
  "₱5,000 – ₱10,000",
  "₱10,000 – ₱20,000",
  "Above ₱20,000",
  "Not sure",
] as const

/**
 * Fields the model may turn into chips. The options are canonical and supplied
 * by the server — the model picks the field, never the values — so a typo or a
 * hallucinated option can't reach the lead.
 *
 * There is deliberately no free-form escape hatch: given one, the model used it
 * to reduce real questions ("how much does it cost?") to a Yes/No button pair
 * instead of answering them.
 */
export const CHOICE_FIELDS = {
  // --- the three the assessment actually asks, in the order it asks them ------
  // Shares its LABEL with the free-text `monthlyBill` in DETAIL_FIELDS, and that
  // is deliberate. The two are the same question asked two ways — chips here,
  // a typed figure on the marketing site's lead form — and `collectedFields`
  // scans by label, so answering either marks the field collected and the model
  // stops asking. Give them different labels and a visitor who taps a bracket
  // gets asked for their bill a second time.
  monthlyBill: { label: "Average monthly bill (PHP)", options: MONTHLY_BILL_RANGES },
  // Spelled to match the OTHER two channels, not to read best in isolation.
  // `solarworks-landingpage/app/api/leads/route.ts` and the Google Form bridge
  // both write "Daytime vs nighttime usage", and all three land in the same
  // detail map on the same lead. Two spellings of one question means the
  // adviser's inbox shows it under two headings and nothing can group them, so
  // the odd one out moved rather than the two that already agreed.
  usagePattern: { label: "Daytime vs nighttime usage", options: USAGE_PATTERNS },
  // Label deliberately left as "Primary goal" even though the options changed
  // wholesale. It is not visitor-facing — the chip shows the option, never the
  // label — but it IS the key every existing lead document, the marketing
  // form's leads and the dashboard already carry. Renaming it to "Electricity
  // goal" would fork the same question into two spellings in the inbox and buy
  // nothing anyone can see.
  primaryGoal: { label: "Primary goal", options: PRIMARY_GOALS },
  // --- retired from the flow; see the note above PROPERTY_TYPES --------------
  propertyType: { label: "Property type", options: PROPERTY_TYPES },
  solutionInterest: { label: "Preferred solution", options: SOLUTION_INTERESTS },
  contactMethod: { label: "Preferred contact", options: CONTACT_METHODS },
} as const

export type ChoiceField = keyof typeof CHOICE_FIELDS

export const CHOICE_FIELD_KEYS = Object.keys(CHOICE_FIELDS) as ChoiceField[]

/** Fields the inline details card can ask for. */
export const DETAIL_FIELDS = {
  fullName: {
    label: "Full name",
    type: "text",
    autoComplete: "name",
    placeholder: "Juan Dela Cruz",
    required: true,
  },
  mobile: {
    label: "Mobile number",
    type: "tel",
    autoComplete: "tel",
    placeholder: "0917 555 0142",
    required: true,
  },
  email: {
    label: "Email",
    type: "email",
    autoComplete: "email",
    placeholder: "you@email.com",
    required: false,
  },
  barangay: {
    label: "Barangay",
    type: "text",
    autoComplete: "address-level4",
    placeholder: "San Pioquinto",
    required: false,
  },
  city: {
    label: "City / Municipality",
    type: "text",
    autoComplete: "address-level2",
    placeholder: "Malvar",
    required: true,
  },
  province: {
    label: "Province",
    type: "text",
    autoComplete: "address-level1",
    placeholder: "Batangas",
    required: false,
  },
  monthlyBill: {
    label: "Average monthly bill (PHP)",
    type: "text",
    autoComplete: "off",
    placeholder: "e.g. 8,000",
    required: false,
  },
  monthlyKwh: {
    label: "Average monthly use (kWh)",
    type: "text",
    autoComplete: "off",
    placeholder: "e.g. 450",
    required: false,
  },
} as const

/**
 * Worked examples the assistant shows when asking for a free-text field.
 *
 * On the web these are the form's placeholders. On Messenger there IS no form —
 * the model asks in prose, one field at a time — so without an example a visitor
 * asked for their location answers "Batangas", which is a province and tells us
 * nothing about serviceability. Showing the shape gets the barangay and
 * municipality too, in one turn instead of three.
 *
 * Real Batangas place names on purpose: a Manila-centric example reads as
 * written for someone else, and this is a Batangas/Laguna/Cavite business.
 *
 * Referenced by the system prompt, so an edit here reaches both channels — do
 * not hardcode a second copy in brain.ts.
 */
export const FORMAT_EXAMPLES = {
  location: "San Pioquinto, Malvar, Batangas",
  mobile: "0917 555 0142",
  email: "juan@gmail.com",
  fullName: "Juan Dela Cruz",
} as const

export type DetailFieldKey = keyof typeof DETAIL_FIELDS

export const DETAIL_FIELD_KEYS = Object.keys(DETAIL_FIELDS) as DetailFieldKey[]

/**
 * Every label a structured answer can arrive under. The server scans the
 * transcript for these to work out what has already been collected — the model
 * on its own will happily ask the same question three times in a row.
 */
export const KNOWN_FIELD_LABELS: ReadonlySet<string> = new Set([
  ...Object.values(CHOICE_FIELDS).map((f) => f.label),
  ...Object.values(DETAIL_FIELDS).map((f) => f.label),
])

/**
 * What must be in hand before it's worth asking for consent.
 *
 * This list IS the flow: `collectedFieldsNote` turns whatever is missing into
 * "Still needed: …", which is what actually walks the model through the
 * questions. Adding a label here adds a question to every conversation, so it
 * is kept to the shortest set that produces a lead an adviser can act on.
 *
 * Listed in the order they are asked. The three assessment questions come
 * first because they are taps, and a visitor who has already answered three
 * things is far likelier to hand over a phone number than one asked for it
 * cold.
 *
 * "Full name" is the one entry that is not one of the four questions the
 * business asked for, and it is not optional: `handleSaveLead` rejects a save
 * outright when the name is shorter than two characters. Drop it from here and
 * the model happily reaches consent without one, the forced save on the consent
 * turn fails, and a visitor who has just agreed to be contacted is never
 * stored — the worst outcome in this whole flow.
 *
 * "City / Municipality" used to be here and is not any more. Nothing downstream
 * hard-fails without it: `createLead` takes no address, and `lead-intel` scores
 * bill, property type, urgency and contactability but never location. An
 * adviser can ask where someone lives on the call they are about to make.
 */
export const REQUIRED_FIELD_LABELS = [
  "Average monthly bill (PHP)",
  "Daytime vs nighttime usage",
  "Primary goal",
  "Full name",
  "Mobile number",
] as const

/**
 * Tappable follow-ups offered under a plain prose reply.
 *
 * These are chosen by the SERVER from the canonical lists below, never by the
 * model — same reasoning as `CHOICE_FIELDS`: given the freedom, the model turns
 * real questions into a Yes/No pair instead of answering them. Being canonical
 * also means the visitor always has something to tap, including on the turns
 * where the model answered a question rather than asking one.
 */
export const START_ASSESSMENT_CHIP = "Start my free assessment"

/** Quick-start prompts shown with the greeting, before the visitor types. */
export const SUGGESTED_QUESTIONS = [
  "How much does a solar system cost?",
  "What warranties do you offer?",
  "Do I need a battery?",
  "How long does installation take?",
] as const

/**
 * The wider pool drawn on for follow-up chips. Ordered roughly by how often
 * visitors ask; anything they've already asked is filtered out, so the list
 * naturally advances through the pool as the conversation goes on.
 */
export const FOLLOW_UP_QUESTIONS = [
  "How much does a solar system cost?",
  "How does the assessment work?",
  "Do I need a battery?",
  "How does net metering work?",
  "How long does installation take?",
  "What warranties do you offer?",
  "Will my roof suit solar panels?",
  "Do you serve my area?",
] as const

/** How many chips to offer at once — three fits one row on a phone. */
const MAX_SUGGESTIONS = 3

/**
 * Pick the chips to show beneath a prose reply.
 *
 * `asked` is every message the visitor has sent, used to drop questions they've
 * already put to us. `offerAssessment` adds the start chip.
 */
export function suggestFollowUps(asked: string[], offerAssessment: boolean): string[] {
  const seen = new Set(asked.map((m) => m.trim().toLowerCase()))
  const chips = offerAssessment ? [START_ASSESSMENT_CHIP] : []

  for (const question of FOLLOW_UP_QUESTIONS) {
    if (chips.length >= MAX_SUGGESTIONS) break
    if (!seen.has(question.toLowerCase())) chips.push(question)
  }
  return chips
}

/**
 * The exact messages the consent card sends. Shared because the server needs to
 * recognise the acceptance verbatim: that is the one turn where saving the lead
 * is the only correct action, so it is forced rather than left to the model.
 *
 * On Messenger these travel as the quick reply's `payload` (1000-char budget)
 * rather than its `title` (20 chars), so the same verbatim match works there.
 */
export const CONSENT_ACCEPT_TEXT = "Yes — I agree to be contacted and to have my details stored."
export const CONSENT_DECLINE_TEXT = "No — please don't store my details for now."

/** A structured input block the server asks the client to render. */
export type ChatUi =
  | { kind: "choice"; field: ChoiceField; question: string; options: string[]; multi: boolean }
  | { kind: "details"; question: string; fields: DetailFieldKey[] }
  | { kind: "consent"; summary: string }

/**
 * Normalise a Philippine mobile number to `09XXXXXXXXX`, or return null when it
 * isn't one. Accepts `0917…`, `+63917…`, `63917…` and `917…`, with spaces,
 * dashes or parentheses anywhere. Used by BOTH the inline form (immediate
 * feedback) and the server (authoritative check) — previously any non-empty
 * string was accepted as a phone number.
 */
export function normalizePhMobile(raw: string): string | null {
  const cleaned = raw.replace(/[^\d+]/g, "")
  let digits = cleaned.startsWith("+") ? cleaned.slice(1) : cleaned

  if (digits.startsWith("63") && digits.length === 12) digits = `0${digits.slice(2)}`
  else if (digits.startsWith("9") && digits.length === 10) digits = `0${digits}`

  return /^09\d{9}$/.test(digits) ? digits : null
}

/**
 * Label a chip answer with the field it answers, e.g. `Property type: Home`.
 *
 * A bare "Home" reads as ambiguous in the transcript and the model would re-ask
 * the same question on the next turn; naming the field makes the answer
 * self-describing. Same reasoning as `formatDetailAnswer` below.
 */
export function formatChoiceAnswer(field: ChoiceField, value: string): string {
  return `${CHOICE_FIELDS[field].label}: ${value}`
}

/**
 * Render answered detail fields as a labelled block. Labelled lines (rather than
 * a comma-joined blob) make the values unambiguous for the model to read back
 * into `save_lead`.
 */
export function formatDetailAnswer(values: Partial<Record<DetailFieldKey, string>>): string {
  return DETAIL_FIELD_KEYS.filter((key) => values[key]?.trim())
    .map((key) => `${DETAIL_FIELDS[key].label}: ${values[key]!.trim()}`)
    .join("\n")
}
