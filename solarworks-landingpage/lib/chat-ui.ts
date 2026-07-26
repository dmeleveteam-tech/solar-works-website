/**
 * Shared vocabulary for the Solar Assistant's structured input blocks.
 *
 * The chat route (server) and the chat widget (client) both import this so a
 * quick-reply chip can never offer a value that `save_lead` would later reject.
 * Deliberately free of `server-only` and of any React import — it is plain data
 * plus two pure helpers.
 *
 * This file is a MIRROR of `solarworks-platform/lib/chat/vocab.ts`, which is
 * authoritative: the chat brain lives there and validates against its copy,
 * while the client here renders from this one. The two apps are separate pnpm
 * projects with no shared package, hence the duplication. Only two things are a
 * genuine cross-app contract — `DETAIL_FIELD_KEYS` and the
 * `CONSENT_ACCEPT_TEXT` / `CONSENT_DECLINE_TEXT` strings. The option lists
 * cannot drift visibly: they travel on the wire inside each `ChatUi` block, so
 * the client always renders whatever the platform sent.
 *
 * Design note: these blocks are an INPUT AFFORDANCE ONLY. Whatever the visitor
 * taps or fills in is turned into an ordinary `role: "user"` text message before
 * it reaches the model, so the LLM's view of the conversation stays plain text
 * and the whole flow still works by typing if the model ignores these tools.
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
    placeholder: "Barangay",
    required: false,
  },
  city: {
    label: "City / Municipality",
    type: "text",
    autoComplete: "address-level2",
    placeholder: "City / Municipality",
    required: true,
  },
  province: {
    label: "Province",
    type: "text",
    autoComplete: "address-level1",
    placeholder: "Province",
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
 *
 * Nothing is offered once qualification is under way — see `SuggestionStage`.
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
