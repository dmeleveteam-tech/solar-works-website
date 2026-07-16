import { NextResponse } from "next/server"

import { forwardLead } from "@/lib/leads"
import { siteConfig } from "@/lib/site-config"
import { getFaqs } from "@/lib/content/api"
import { howItWorks, type Faq } from "@/lib/content/site-content"

/**
 * Server-side brain for the Solar Assistant chatbot (build guide: "AI Lead
 * Chatbot"). The browser sends the running transcript; we prepend the system
 * brief, call Groq, and — once the visitor has been qualified and has given
 * explicit consent — let the model call the `save_lead` tool, which we
 * validate and forward to the platform inbox as a `chatbot` lead.
 *
 * The Groq key lives only here, never in the browser. The endpoint degrades
 * gracefully: with no key it returns a friendly hand-off message rather than
 * an error, mirroring how the rest of the site behaves before keys are set.
 */

const GROQ_API_KEY = process.env.GROQ_API_KEY
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile"
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

// Input guards: keep a hostile or runaway client from blowing up token usage.
const MAX_MESSAGES = 40
const MAX_CONTENT = 2000

type Role = "user" | "assistant"
type ChatMessage = { role: Role; content: string }

const HUMAN_FALLBACK = `I'm not available to chat right now, but our team is. You can ${siteConfig.primaryCta.label.toLowerCase()} at ${siteConfig.primaryCta.href}, or message us on Viber and a real person will help you straight away.`

/** Render the FAQ knowledge base (CMS-backed, static fallback) as Q&A text grouped by category. */
function renderFaqKnowledge(faqs: Faq[]): string {
  if (faqs.length === 0) return "(no FAQ entries loaded)"
  const byCategory = new Map<string, Faq[]>()
  for (const faq of faqs) {
    const list = byCategory.get(faq.category) ?? []
    list.push(faq)
    byCategory.set(faq.category, list)
  }
  return Array.from(byCategory.entries())
    .map(([category, items]) => {
      const lines = items.map((f) => `- Q: ${f.question}\n  A: ${f.answer}`).join("\n")
      return `${category}:\n${lines}`
    })
    .join("\n\n")
}

const renderProcessKnowledge = (): string =>
  howItWorks.map((step) => `${step.number}. ${step.title} — ${step.description}`).join("\n")

const systemPrompt = (faqs: Faq[]): string => `
You are the Solar Assistant for ${siteConfig.name} (${siteConfig.legalName}), a solar installation company serving ${siteConfig.serviceAreas.join(", ")} in the Philippines. You help homeowners and businesses figure out whether solar fits them, answer their questions, and capture their details so a real adviser can prepare a proper assessment.

# Your goal
Answer the visitor's questions confidently using the knowledge base below, and guide them through a friendly qualification chat so that, once they consent, you save their details as a lead. Keep replies short, warm, and plain — one or two questions at a time, never a wall of text.

# What you know (answer directly from this — do not defer these to "an adviser")
## Frequently asked questions
${renderFaqKnowledge(faqs)}

## How the process works
${renderProcessKnowledge()}

## Company facts
- Warranties: ${siteConfig.warranties.panel}, ${siteConfig.warranties.battery}, ${siteConfig.warranties.support}.
- Service areas: ${siteConfig.serviceAreas.join(", ")}.
- Contact: phone/Viber/WhatsApp ${siteConfig.contact.phone.value}, email ${siteConfig.contact.email.value}.

# Qualification flow (adapt naturally; don't interrogate)
1. Greet and offer two paths: get a solar assessment, or ask a question first.
2. Property type: home, farm, resort, school, office, or commercial.
3. Location: barangay, city/municipality, province (used to confirm serviceability).
4. Energy use: average monthly consumption in kWh; if unknown, average monthly electricity bill in PHP. Label it as an estimate if they're unsure.
5. Main goal: lower bills, backup power during outages, or both (for businesses, operating-cost savings).
6. Contact details: full name, mobile number, optional email, and preferred contact method (Call / Viber / WhatsApp / Email).
7. Consent: before saving anything, clearly ask for permission to store their details and have ${siteConfig.name} contact them about an assessment. Only proceed on a clear yes.
8. After consent, call the save_lead tool. Then confirm warmly and set expectations: the team will review their consumption and arrange a discussion or site assessment.

# Hard guardrails
- You are an AI assistant. Never imply you are a licensed engineer or a human employee.
- Never give binding quotations, guaranteed savings, definitive roof suitability, or final system sizing. Pricing depends on consumption, site conditions, roof, and battery needs — say so and steer toward an assessment.
- Use the knowledge base above to answer general questions (cost ballpark, warranties, battery, installation, net metering, process) directly and naturally, in your own words — don't just paste the FAQ text.
- Only for questions truly outside the knowledge base (e.g. something site-specific, legal, or not covered above), say a ${siteConfig.name} adviser will confirm, and offer to take their details.
- Only call save_lead AFTER explicit consent and once you have at least a full name and mobile number. Never call it twice for the same person.
- At any time, a visitor can reach a human directly: phone ${siteConfig.contact.phone.value}, Viber/WhatsApp ${siteConfig.contact.whatsapp.value}.
`.trim()

const tools = [
  {
    type: "function" as const,
    function: {
      name: "save_lead",
      description:
        "Save the qualified visitor as a lead for the Solar Works sales team. Only call AFTER the visitor has explicitly consented to be contacted and to have their details stored, and after you have collected at least their full name and mobile number.",
      parameters: {
        type: "object",
        properties: {
          fullName: { type: "string", description: "Visitor's full name." },
          mobile: { type: "string", description: "Philippine mobile number, e.g. 09xx or +63xx." },
          email: { type: "string", description: "Email address, if given." },
          propertyType: {
            type: "string",
            enum: ["Home", "Farm", "Resort", "School", "Office", "Commercial", "Other"],
          },
          location: { type: "string", description: "Barangay, City/Municipality, Province." },
          monthlyKwh: { type: "string", description: "Average monthly consumption in kWh, if given." },
          monthlyBill: { type: "string", description: "Average monthly electricity bill in PHP, if given." },
          primaryGoal: {
            type: "string",
            description: "e.g. Lower bill, Backup power, Both, Business operating cost, Sustainability.",
          },
          solutionInterest: {
            type: "string",
            enum: ["Grid-Tied", "Hybrid with Battery", "Not Sure Yet", "Commercial Solar"],
          },
          contactMethod: { type: "string", enum: ["Call", "Viber", "WhatsApp", "Email"] },
          consent: {
            type: "boolean",
            description:
              "True ONLY if the visitor has explicitly agreed to be contacted and to have their details stored.",
          },
        },
        required: ["fullName", "mobile", "consent"],
      },
    },
  },
]

type GroqMessage = {
  role: "system" | "user" | "assistant" | "tool"
  content: string | null
  tool_calls?: GroqToolCall[]
  tool_call_id?: string
}

type GroqToolCall = {
  id: string
  type: "function"
  function: { name: string; arguments: string }
}

type GroqChoice = {
  message: { content: string | null; tool_calls?: GroqToolCall[] }
}

async function callGroq(messages: GroqMessage[], withTools: boolean): Promise<GroqChoice> {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages,
      temperature: 0.4,
      max_tokens: 700,
      ...(withTools ? { tools, tool_choice: "auto" } : {}),
    }),
    cache: "no-store",
  })
  if (!res.ok) {
    throw new Error(`Groq error ${res.status}: ${await res.text().catch(() => "")}`)
  }
  const data = (await res.json()) as { choices?: GroqChoice[] }
  const choice = data.choices?.[0]
  if (!choice) throw new Error("Groq returned no choices")
  return choice
}

const str = (v: unknown): string => (typeof v === "string" ? v.trim() : "")

// Marketing attribution keys accepted from the browser (L-04). Anything else is
// ignored so the chat client can't stuff the lead document.
const ATTRIBUTION_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "landing_page",
  "referrer",
] as const

/** Keep only the whitelisted attribution keys, each trimmed and capped. */
function cleanAttribution(raw: unknown): Record<string, string> {
  const out: Record<string, string> = {}
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>
    for (const key of ATTRIBUTION_KEYS) {
      const value = str(obj[key]).slice(0, 300)
      if (value) out[key] = value
    }
  }
  return out
}

/** Validate the model's save_lead args and forward as a chatbot lead. */
async function handleSaveLead(
  rawArgs: string,
  attribution: Record<string, string>,
): Promise<{ saved: boolean; reason?: string }> {
  let args: Record<string, unknown>
  try {
    args = JSON.parse(rawArgs) as Record<string, unknown>
  } catch {
    return { saved: false, reason: "Arguments were not valid JSON; ask the visitor again." }
  }

  const name = str(args.fullName)
  const phone = str(args.mobile)
  if (name.length < 2) return { saved: false, reason: "Missing full name." }
  if (!phone) return { saved: false, reason: "Missing mobile number." }
  if (args.consent !== true) {
    return { saved: false, reason: "Consent not granted. Do not save until the visitor explicitly agrees." }
  }

  const details: Record<string, string> = {}
  const put = (label: string, value: unknown) => {
    const s = str(value)
    if (s) details[label] = s
  }
  put("Address", args.location)
  put("Property type", args.propertyType)
  put("Preferred solution", args.solutionInterest)
  put("Monthly bill (PHP)", args.monthlyBill)
  put("Monthly consumption (kWh)", args.monthlyKwh)
  put("Primary goal", args.primaryGoal)
  put("Preferred contact", args.contactMethod)
  details["Consent"] = "Yes — granted via Solar Assistant chat"
  // Carry first-touch marketing attribution onto the chatbot lead (L-04).
  for (const [key, value] of Object.entries(attribution)) {
    details[key] = value
  }

  const result = await forwardLead({
    name,
    phone,
    email: str(args.email) || undefined,
    details,
    source: "chatbot",
  })
  if (!result.ok) {
    return { saved: false, reason: "The system couldn't save the lead right now; offer Viber/phone instead." }
  }
  return { saved: true }
}

export async function POST(req: Request) {
  // Validate input shape before doing anything else.
  let body: { messages?: unknown; attribution?: unknown }
  try {
    body = (await req.json()) as { messages?: unknown; attribution?: unknown }
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }

  if (!Array.isArray(body.messages)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 })
  }
  const attribution = cleanAttribution(body.attribution)
  const history: ChatMessage[] = body.messages
    .slice(-MAX_MESSAGES)
    .filter(
      (m): m is ChatMessage =>
        !!m &&
        typeof m === "object" &&
        ((m as ChatMessage).role === "user" || (m as ChatMessage).role === "assistant") &&
        typeof (m as ChatMessage).content === "string",
    )
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_CONTENT) }))

  if (history.length === 0) {
    return NextResponse.json({ error: "No messages." }, { status: 400 })
  }

  // No Groq key → can't run the AI at all; hand off to humans gracefully.
  if (!GROQ_API_KEY) {
    return NextResponse.json({ message: HUMAN_FALLBACK, leadSaved: false })
  }

  const faqs = await getFaqs()
  const messages: GroqMessage[] = [
    { role: "system", content: systemPrompt(faqs) },
    ...history,
  ]

  try {
    const first = await callGroq(messages, true)
    const toolCalls = first.message.tool_calls ?? []

    if (toolCalls.length === 0) {
      return NextResponse.json({ message: first.message.content ?? "", leadSaved: false })
    }

    // Run the tool call(s), then ask the model for a natural closing reply.
    let leadSaved = false
    messages.push({
      role: "assistant",
      content: first.message.content ?? "",
      tool_calls: toolCalls,
    })
    for (const tc of toolCalls) {
      const result =
        tc.function.name === "save_lead"
          ? await handleSaveLead(tc.function.arguments, attribution)
          : { saved: false, reason: "Unknown tool." }
      if (result.saved) leadSaved = true
      messages.push({
        role: "tool",
        tool_call_id: tc.id,
        content: JSON.stringify(result),
      })
    }

    const second = await callGroq(messages, false)
    return NextResponse.json({ message: second.message.content ?? "", leadSaved })
  } catch (err) {
    console.error("Chat error:", err)
    return NextResponse.json({ message: HUMAN_FALLBACK, leadSaved: false })
  }
}
