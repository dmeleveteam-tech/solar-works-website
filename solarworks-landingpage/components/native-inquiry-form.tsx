"use client"

import * as React from "react"
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Loader2,
  MessageCircle,
  Pencil,
  ShieldCheck,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { siteConfig } from "@/lib/site-config"
import { track, ANALYTICS_EVENTS } from "@/lib/analytics"
import { getAttribution } from "@/lib/attribution"
import { MESSENGER_HREF } from "@/lib/messenger"
import { Turnstile, TURNSTILE_SITE_KEY } from "@/components/turnstile"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

/* ── The question set ────────────────────────────────────────────────────────
   These strings are the contract, not copy. The Messenger bot and the Google
   Form ask the same three questions with the same option labels, and all three
   channels land in the same inbox column — so a stray space or a hyphen where
   an en-dash belongs shows one question under two headings in the reports.
   Change them in all three places or not at all.                            */

const BILL_RANGES = [
  "Below ₱3,000",
  "₱3,000 – ₱5,000",
  "₱5,000 – ₱10,000",
  "₱10,000 – ₱20,000",
  "Above ₱20,000",
  "Not sure",
] as const

const USAGE_PROFILES = [
  "Mostly daytime",
  "Mostly night",
  "About even",
  "Not sure",
] as const

const PRIMARY_GOALS = [
  "Cut bill by ~50%",
  "Near-zero bill",
  "Fix brownout issues",
  "All of these",
] as const

/* ── Step model ──────────────────────────────────────────────────────────────
   One question per step. The whole point of the rewrite is that a visitor never
   scrolls to answer or to reach the button, so the number of steps is allowed
   to grow but the content of any one step is not.                           */

type AnswerKey = "fullName" | "mobile" | "monthlyBill" | "usageProfile" | "primaryGoal"
type Answers = Record<AnswerKey, string>
type Errors = Partial<Record<AnswerKey | "consent", string>>

const EMPTY_ANSWERS: Answers = {
  fullName: "",
  mobile: "",
  monthlyBill: "",
  usageProfile: "",
  primaryGoal: "",
}

const STEP_COUNT = 5
const LAST_STEP = STEP_COUNT - 1

/** How long a chosen option stays visibly selected before we move on. Short
    enough to feel instant, long enough that the visitor sees the tick land —
    without it the next question appears to arrive for no reason. */
const AUTO_ADVANCE_MS = 300

/* The recap on the last step, and the "Edit" buttons on it, both need to know
   which step owns which answer. */
const STEP_OF: Record<AnswerKey, number> = {
  fullName: 0,
  mobile: 0,
  monthlyBill: 1,
  usageProfile: 2,
  primaryGoal: 3,
}

export function NativeInquiryForm({ defaultSolution }: { defaultSolution?: string }) {
  const [step, setStep] = React.useState(0)
  const [answers, setAnswers] = React.useState<Answers>(EMPTY_ANSWERS)
  const [consent, setConsent] = React.useState(false)
  const [errors, setErrors] = React.useState<Errors>({})
  const [status, setStatus] = React.useState<"idle" | "submitting" | "success">("idle")
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const [turnstileToken, setTurnstileToken] = React.useState("")

  const handleTurnstileVerify = React.useCallback((t: string) => setTurnstileToken(t), [])
  const handleTurnstileExpire = React.useCallback(() => setTurnstileToken(""), [])

  const startedRef = React.useRef(false)
  function handleFirstInteraction() {
    if (startedRef.current) return
    startedRef.current = true
    track(ANALYTICS_EVENTS.leadFormStart)
  }

  /* ── Focus handling ───────────────────────────────────────────────────────
     Every step registers the element that should receive focus when it becomes
     the active one: the first input where there is one, the heading otherwise.
     Moving focus is what tells a screen reader the question changed — the
     aria-live counter below only carries the position.                      */
  const focusTargets = React.useRef<(HTMLElement | null)[]>([])
  const isFirstRender = React.useRef(true)

  React.useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    // preventScroll matters, independent of any scrolling library: focusing an
    // element the browser considers newly revealed makes it scroll that element
    // into view, and a viewport that jumps on every step is the exact thing
    // this form exists to remove.
    focusTargets.current[step]?.focus({ preventScroll: true })
  }, [step])

  /* ── Auto-advance ─────────────────────────────────────────────────────────
     Choice steps move on by themselves; text steps wait for an explicit Next.
     The timer is keyed to the step it was started from, so a visitor who
     changes their mind twice quickly never gets skipped two steps forward. */
  const advanceTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  React.useEffect(
    () => () => {
      if (advanceTimer.current) clearTimeout(advanceTimer.current)
    },
    [],
  )

  function choose(key: AnswerKey, value: string, from: number) {
    setAnswers((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
    if (advanceTimer.current) clearTimeout(advanceTimer.current)
    if (from === LAST_STEP) return
    advanceTimer.current = setTimeout(() => {
      setStep((current) => (current === from ? current + 1 : current))
    }, AUTO_ADVANCE_MS)
  }

  /** Validate only what the current step asks for. Errors render inline under
      the field — we never move the visitor somewhere to read them. */
  function validateStep(index: number): Errors {
    const next: Errors = {}
    if (index === 0) {
      if (answers.fullName.trim().length < 2) next.fullName = "Please enter your full name."
      const digits = answers.mobile.replace(/\D/g, "")
      if (!answers.mobile.trim()) next.mobile = "Please enter a mobile number."
      else if (digits.length < 7) next.mobile = "That does not look like a full mobile number."
    }
    if (index === 1 && !answers.monthlyBill) next.monthlyBill = "Please pick a range — a rough one is fine."
    if (index === 2 && !answers.usageProfile) next.usageProfile = "Please pick the closest match."
    if (index === 3 && !answers.primaryGoal) next.primaryGoal = "Please pick what matters most."
    if (index === LAST_STEP && !consent) next.consent = "Please agree before we contact you."
    return next
  }

  function goNext() {
    const found = validateStep(step)
    setErrors(found)
    if (Object.keys(found).length > 0) return false
    setStep((current) => Math.min(current + 1, LAST_STEP))
    return true
  }

  function goTo(index: number) {
    if (advanceTimer.current) clearTimeout(advanceTimer.current)
    setStep(index)
  }

  /** Enter advances. On the last step we let the event fall through to the
      form's submit so Enter sends the inquiry. */
  function onKeyDown(e: React.KeyboardEvent<HTMLFormElement>) {
    if (e.key !== "Enter" || e.shiftKey) return
    if (step === LAST_STEP) return
    e.preventDefault()
    goNext()
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    // Belt and braces: a stray Enter or an implicit submit from an earlier step
    // should advance, never send a half-answered lead.
    if (step !== LAST_STEP) {
      goNext()
      return
    }

    // Re-check every step, not just the last one — someone could have reached
    // the end and then cleared a field by going back.
    const found: Errors = {}
    for (let i = 0; i <= LAST_STEP; i++) Object.assign(found, validateStep(i))
    setErrors(found)
    if (Object.keys(found).length > 0) {
      const firstBroken = (Object.keys(found) as (AnswerKey | "consent")[])[0]
      if (firstBroken !== "consent") goTo(STEP_OF[firstBroken])
      return
    }

    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      setSubmitError("Please complete the spam-protection check above.")
      return
    }

    setStatus("submitting")
    setSubmitError(null)

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        // Each answer travels as its own field; the route turns them into
        // labelled rows in the inbox. `primaryGoal` maps to "Primary goal" —
        // deliberately not the `goals` array, which writes a different label.
        body: JSON.stringify({
          fullName: answers.fullName.trim(),
          mobile: answers.mobile.trim(),
          monthlyBill: answers.monthlyBill,
          usageProfile: answers.usageProfile,
          primaryGoal: answers.primaryGoal,
          // Not a question we ask — it comes from the ?solution= deep link on
          // the solutions pages, so the adviser knows what they were reading.
          solutionInterest: defaultSolution ?? "",
          // The server re-checks this and refuses the lead without it; the
          // validation above is only there to tell the visitor first.
          consent,
          turnstileToken,
          attribution: getAttribution(),
        }),
      })

      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as { error?: string } | null
        throw new Error(payload?.error ?? "Submit failed")
      }

      track(ANALYTICS_EVENTS.leadFormSubmit)
      setStatus("success")
    } catch (err) {
      setStatus("idle")
      setSubmitError(
        err instanceof Error && err.message !== "Submit failed"
          ? err.message
          : "Something went wrong. Please try again, or contact us directly.",
      )
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-[1.75rem] border bg-card p-8 text-center shadow-sm">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-primary/15 text-primary">
          <CheckCircle2 className="size-7" />
        </span>
        <h3 className="mt-5 text-xl font-semibold">Thank you — we&apos;ve got it.</h3>
        <p className="mx-auto mt-2 max-w-md text-muted-foreground text-pretty">
          A Solar Works adviser will review your details and reach out shortly. Prefer to talk now?
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild>
            <a href={siteConfig.contact.viber.href}>
              <MessageCircle /> Chat on Viber
            </a>
          </Button>
          {MESSENGER_HREF && (
            <Button asChild variant="outline">
              <a href={MESSENGER_HREF} target="_blank" rel="noopener noreferrer">
                <ExternalLink /> Message us on Messenger
              </a>
            </Button>
          )}
          <Button asChild variant="outline">
            <a href={siteConfig.contact.phone.href}>Call {siteConfig.contact.phone.value}</a>
          </Button>
        </div>
      </div>
    )
  }

  const registerFocus = (index: number) => (el: HTMLElement | null) => {
    focusTargets.current[index] = el
  }

  return (
    <form
      onSubmit={onSubmit}
      onKeyDown={onKeyDown}
      onFocusCapture={handleFirstInteraction}
      noValidate
      className="rounded-[1.75rem] border bg-card p-5 shadow-sm sm:p-8"
    >
      {/* ── Progress ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <span className="section-label">Free assessment</span>
        <span className="text-xs font-medium tabular-nums text-muted-foreground">
          Step {step + 1} of {STEP_COUNT}
        </span>
      </div>
      <div className="mt-3 flex gap-1.5" aria-hidden="true">
        {Array.from({ length: STEP_COUNT }, (_, i) => (
          <span
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors duration-300 motion-reduce:transition-none",
              i <= step ? "bg-primary" : "bg-border",
            )}
          />
        ))}
      </div>
      {/* The counter is announced on its own; the heading focus below carries
          the question itself. */}
      <p aria-live="polite" className="sr-only">
        Step {step + 1} of {STEP_COUNT}
      </p>

      {/* ── Step stack ────────────────────────────────────────────────────
          Every step is rendered into the same grid cell, so the container is
          always as tall as the tallest step and the card never resizes between
          questions — no magic min-height to keep in sync with the copy. The
          inactive ones are inert, so they are out of the tab order and out of
          the accessibility tree while they sit behind the active one. */}
      <div className="mt-7 grid">
        {Array.from({ length: STEP_COUNT }, (_, i) => i).map((i) => {
          const active = i === step
          return (
            <div
              key={i}
              // Stack: every step occupies row 1 / column 1.
              className={cn(
                "[grid-area:1/1] transition-[opacity,transform] duration-300 ease-[var(--ease-out-strong)] motion-reduce:transition-none motion-reduce:transform-none",
                active
                  ? "translate-x-0 opacity-100"
                  : cn(
                      "pointer-events-none opacity-0",
                      i < step ? "-translate-x-4" : "translate-x-4",
                    ),
              )}
              inert={!active}
              aria-hidden={!active}
            >
              {i === 0 && (
                <ContactStep
                  answers={answers}
                  errors={errors}
                  onChange={(key, value) => {
                    setAnswers((prev) => ({ ...prev, [key]: value }))
                    setErrors((prev) => ({ ...prev, [key]: undefined }))
                  }}
                  headingRef={registerFocus(0)}
                />
              )}
              {i === 1 && (
                <ChoiceStep
                  id="bill"
                  heading="What is your monthly electricity bill range in the last 6 months?"
                  hint="A rough figure is enough — we size the system from the range."
                  options={BILL_RANGES}
                  value={answers.monthlyBill}
                  error={errors.monthlyBill}
                  columns={2}
                  onChoose={(v) => choose("monthlyBill", v, 1)}
                  headingRef={registerFocus(1)}
                />
              )}
              {i === 2 && (
                <ChoiceStep
                  id="usage"
                  heading="What is your daytime vs nighttime electricity usage?"
                  hint="Daytime use is what solar covers directly, without a battery."
                  options={USAGE_PROFILES}
                  value={answers.usageProfile}
                  error={errors.usageProfile}
                  columns={2}
                  onChoose={(v) => choose("usageProfile", v, 2)}
                  headingRef={registerFocus(2)}
                />
              )}
              {i === 3 && (
                <ChoiceStep
                  id="goal"
                  heading="What do you want solar to do for your electricity bill?"
                  hint="This decides whether we quote grid-tied or hybrid."
                  options={PRIMARY_GOALS}
                  value={answers.primaryGoal}
                  error={errors.primaryGoal}
                  columns={2}
                  onChoose={(v) => choose("primaryGoal", v, 3)}
                  headingRef={registerFocus(3)}
                />
              )}
              {i === LAST_STEP && (
                <ReviewStep
                  answers={answers}
                  consent={consent}
                  onConsent={(v) => {
                    setConsent(v)
                    setErrors((prev) => ({ ...prev, consent: undefined }))
                    setSubmitError(null)
                  }}
                  consentError={errors.consent}
                  submitError={submitError}
                  onEdit={goTo}
                  onTurnstileVerify={handleTurnstileVerify}
                  onTurnstileExpire={handleTurnstileExpire}
                  headingRef={registerFocus(LAST_STEP)}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* ── Navigation ────────────────────────────────────────────────────
          Kept outside the stack so the buttons never move between steps. */}
      <div className="mt-7 flex items-center gap-3 border-t pt-5">
        {step > 0 ? (
          <Button type="button" variant="ghost" size="lg" onClick={() => goTo(step - 1)}>
            <ArrowLeft /> Back
          </Button>
        ) : null}
        <div className="ml-auto">
          {step === LAST_STEP ? (
            <Button type="submit" size="lg" disabled={status === "submitting"}>
              {status === "submitting" ? (
                <>
                  <Loader2 className="animate-spin" /> Sending…
                </>
              ) : (
                <>
                  Send my details <ArrowRight />
                </>
              )}
            </Button>
          ) : (
            <Button type="button" size="lg" onClick={goNext}>
              Next <ArrowRight />
            </Button>
          )}
        </div>
      </div>
    </form>
  )
}

/* ── Step 1: name + mobile ──────────────────────────────────────────────── */
function ContactStep({
  answers,
  errors,
  onChange,
  headingRef,
}: {
  answers: Answers
  errors: Errors
  onChange: (key: AnswerKey, value: string) => void
  headingRef: (el: HTMLElement | null) => void
}) {
  return (
    <div>
      <StepHeading id="contact-heading">Who should we get back to?</StepHeading>
      <StepHint>Two details, then three quick questions. Nothing else.</StepHint>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="lead-name">Full name</Label>
          <Input
            id="lead-name"
            name="fullName"
            // Step 1 is the one step with a real input, so focus lands here
            // rather than on the heading when the visitor navigates back.
            ref={headingRef as React.Ref<HTMLInputElement>}
            value={answers.fullName}
            onChange={(e) => onChange("fullName", e.target.value)}
            autoComplete="name"
            placeholder="Juan Dela Cruz"
            aria-invalid={Boolean(errors.fullName)}
            aria-describedby={errors.fullName ? "lead-name-error" : undefined}
            className="h-11"
          />
          <FieldError id="lead-name-error">{errors.fullName}</FieldError>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="lead-mobile">Mobile number</Label>
          <Input
            id="lead-mobile"
            name="mobile"
            value={answers.mobile}
            onChange={(e) => onChange("mobile", e.target.value)}
            inputMode="tel"
            autoComplete="tel"
            placeholder="0917 555 0142"
            aria-invalid={Boolean(errors.mobile)}
            aria-describedby={errors.mobile ? "lead-mobile-error" : undefined}
            className="h-11 tabular-nums"
          />
          <FieldError id="lead-mobile-error">{errors.mobile}</FieldError>
        </div>
      </div>
    </div>
  )
}

/* ── Steps 2–4: one single-choice question ──────────────────────────────────
   The radio group is the real Radix primitive, so arrow keys, Home/End and
   roving tabindex come for free — we do not re-implement any of it. The tile
   is a Label wrapping the radio, so the whole row is a hit target.         */
function ChoiceStep({
  id,
  heading,
  hint,
  options,
  value,
  error,
  columns,
  onChoose,
  headingRef,
}: {
  id: string
  heading: string
  hint: string
  options: readonly string[]
  value: string
  error?: string
  columns: 1 | 2
  onChoose: (value: string) => void
  headingRef: (el: HTMLElement | null) => void
}) {
  const headingId = `${id}-heading`
  return (
    <div>
      <StepHeading id={headingId} ref={headingRef}>
        {heading}
      </StepHeading>
      <StepHint>{hint}</StepHint>

      <RadioGroup
        value={value}
        onValueChange={onChoose}
        aria-labelledby={headingId}
        aria-invalid={Boolean(error)}
        className={cn("mt-6 gap-2", columns === 2 && "sm:grid-cols-2")}
      >
        {options.map((option) => {
          const selected = option === value
          return (
            <Label
              key={option}
              className={cn(
                // Tighter radius than the card, so the rows read as parts of it.
                "flex cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-3 text-sm font-normal transition-[background-color,border-color,box-shadow] duration-150 motion-reduce:transition-none",
                selected
                  ? "border-primary bg-primary/10 font-medium text-foreground shadow-[inset_0_0_0_1px_var(--primary)]"
                  : "border-border/60 bg-transparent text-muted-foreground hover:border-border hover:bg-muted/50 hover:text-foreground",
              )}
            >
              <RadioGroupItem value={option} />
              <span className="tabular-nums">{option}</span>
            </Label>
          )
        })}
      </RadioGroup>
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </div>
  )
}

/* ── Step 5: recap, consent, spam check ─────────────────────────────────── */
function ReviewStep({
  answers,
  consent,
  onConsent,
  consentError,
  submitError,
  onEdit,
  onTurnstileVerify,
  onTurnstileExpire,
  headingRef,
}: {
  answers: Answers
  consent: boolean
  onConsent: (v: boolean) => void
  consentError?: string
  submitError: string | null
  onEdit: (step: number) => void
  onTurnstileVerify: (token: string) => void
  onTurnstileExpire: () => void
  headingRef: (el: HTMLElement | null) => void
}) {
  const rows: { label: string; value: string; key: AnswerKey }[] = [
    { label: "Contact", value: [answers.fullName, answers.mobile].filter(Boolean).join(" · "), key: "fullName" },
    { label: "Monthly bill", value: answers.monthlyBill, key: "monthlyBill" },
    { label: "Usage", value: answers.usageProfile, key: "usageProfile" },
    { label: "Goal", value: answers.primaryGoal, key: "primaryGoal" },
  ]

  return (
    <div>
      <StepHeading id="review-heading" ref={headingRef}>
        Check this over and send it
      </StepHeading>
      <StepHint>An adviser reads every one of these. No autoresponder.</StepHint>

      <dl className="mt-5 grid gap-px overflow-hidden rounded-lg border bg-border">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-3 bg-card px-3.5 py-2.5">
            <dt className="w-28 shrink-0 text-xs text-muted-foreground">{row.label}</dt>
            <dd className="min-w-0 flex-1 truncate text-sm font-medium tabular-nums">
              {row.value || <span className="font-normal text-muted-foreground">Not answered</span>}
            </dd>
            <button
              type="button"
              onClick={() => onEdit(STEP_OF[row.key])}
              className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none"
            >
              <Pencil className="size-3" />
              Edit<span className="sr-only"> {row.label.toLowerCase()}</span>
            </button>
          </div>
        ))}
      </dl>

      {/* Consent (spec: no lead is stored or acted on without it). The server
          enforces this too — see app/api/leads/route.ts. */}
      <div className="mt-4 flex items-start gap-3 rounded-lg border bg-muted/30 p-4">
        <Checkbox
          id="inquiry-consent"
          checked={consent}
          onCheckedChange={(v) => onConsent(v === true)}
          aria-invalid={Boolean(consentError)}
          className="mt-0.5"
        />
        {/* `block` overrides the Label primitive's `flex items-center gap-2`.
            As a flex container it treats the sentence, the link and the closing
            full stop as three separate items — so they wrap independently and
            the full stop ends up orphaned on its own line, gap and all. This is
            running prose, so it has to lay out as prose. */}
        <Label
          htmlFor="inquiry-consent"
          className="block text-sm font-normal leading-relaxed text-pretty"
        >
          I agree to let {siteConfig.name} contact me and store my information for assessment
          purposes, as described in the{" "}
          <a
            href="/privacy"
            className="font-medium text-primary-strong underline-offset-2 hover:underline"
          >
            Privacy Notice
          </a>
          .
        </Label>
      </div>
      <FieldError id="consent-error">{consentError}</FieldError>

      {/* Spam protection */}
      <div className="mt-4">
        {TURNSTILE_SITE_KEY ? (
          <Turnstile onVerify={onTurnstileVerify} onExpire={onTurnstileExpire} />
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-4" />
            Protected by Cloudflare Turnstile
          </div>
        )}
      </div>

      {submitError ? (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {submitError}
        </p>
      ) : null}
    </div>
  )
}

/* ── Shared bits ────────────────────────────────────────────────────────── */

/** Every step gets a real heading, not a Label — it is the thing focus moves to
    on a step change, which is what announces the new question. */
function StepHeading({
  id,
  ref,
  children,
}: {
  id: string
  ref?: (el: HTMLElement | null) => void
  children: React.ReactNode
}) {
  return (
    <h2
      id={id}
      ref={ref as React.Ref<HTMLHeadingElement>}
      tabIndex={-1}
      className="text-xl font-semibold leading-snug text-pretty outline-none sm:text-2xl"
    >
      {children}
    </h2>
  )
}

function StepHint({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 text-sm text-muted-foreground text-pretty">{children}</p>
}

function FieldError({ id, children }: { id: string; children?: string }) {
  if (!children) return null
  return (
    <p id={id} className="mt-2 text-sm text-destructive">
      {children}
    </p>
  )
}
