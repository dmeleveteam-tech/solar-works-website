/**
 * Canonical vocabulary for the Solar Assistant's structured input blocks.
 *
 * THIS FILE IS THE AUTHORITATIVE COPY. A mirror lives at
 * `solarworks-landingpage/lib/chat-ui.ts` because the chat widget's Client
 * Components render from it and the two apps are independent pnpm projects with
 * no shared package. Keep them in sync when editing.
 *
 * The duplication is deliberately bounded: option LISTS travel to the browser
 * inside each `ChatUi` block, so they cannot drift in a way the visitor sees.
 * Only `DETAIL_FIELD_KEYS` and the two consent strings are a genuine contract
 * between the copies — the consent strings because the server must recognise the
 * acceptance verbatim to force the save, and the detail keys because the client
 * decides which inputs to render from them.
 *
 * Design note: these blocks are an INPUT AFFORDANCE ONLY. Whatever the visitor
 * taps or fills in becomes an ordinary `role: "user"` text message before it
 * reaches the model, so the LLM's view of the conversation stays plain text and
 * the whole flow still works by typing if the model ignores these tools. That is
 * also what lets Messenger reuse it: a quick-reply tap arrives as the same
 * labelled text a chip tap does.
 *
 * No `server-only` and no React import — plain data plus pure helpers.
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

export const PRIMARY_GOALS = [
  "Lower my bill",
  "Backup power",
  "Both",
  "Business operating cost",
  "Sustainability",
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
 * "Not sure" is deliberately last and deliberately present: without an escape
 * hatch the visitor's only honest option is to abandon the question, and an
 * unanswered bill still lets the lead through (it is not in
 * REQUIRED_FIELD_LABELS). Do not remove it.
 *
 * English like every other canonical option, even though the assistant mirrors
 * the visitor's language in prose. These strings are DATA, not conversation:
 * they are matched verbatim by `collectedFields`, stored on the lead, and read
 * by the sales team in the dashboard. A chip that changed language per visitor
 * would break the match and fill the dashboard with two spellings of the same
 * answer.
 *
 * Every title must survive Messenger's 20-character quick-reply cap — see the
 * guard test in lib/messenger/render.test.ts. The longest here is 16.
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
  propertyType: { label: "Property type", options: PROPERTY_TYPES },
  primaryGoal: { label: "Primary goal", options: PRIMARY_GOALS },
  solutionInterest: { label: "Preferred solution", options: SOLUTION_INTERESTS },
  contactMethod: { label: "Preferred contact", options: CONTACT_METHODS },
  // Shares its LABEL with the free-text `monthlyBill` in DETAIL_FIELDS, and that
  // is deliberate. The two are the same question asked two ways — chips here,
  // a typed figure on the web form — and `collectedFields` scans by label, so
  // answering either marks the field collected and the model stops asking. Give
  // them different labels and a visitor who taps a bracket gets asked for their
  // bill a second time.
  monthlyBill: { label: "Average monthly bill (PHP)", options: MONTHLY_BILL_RANGES },
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

/** What must be in hand before it's worth asking for consent. */
export const REQUIRED_FIELD_LABELS = [
  "Full name",
  "Mobile number",
  "City / Municipality",
  "Property type",
  "Primary goal",
  "Preferred contact",
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
