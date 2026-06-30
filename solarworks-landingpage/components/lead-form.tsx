"use client"

import * as React from "react"
import { CheckCircle2, Loader2, ShieldCheck, MessageCircle } from "lucide-react"

import { cn } from "@/lib/utils"
import { siteConfig } from "@/lib/site-config"
import { track, ANALYTICS_EVENTS } from "@/lib/analytics"
import { Turnstile, TURNSTILE_SITE_KEY } from "@/components/turnstile"
import {
  propertyTypes,
  solutionInterests,
  primaryGoals,
  utilityProviders,
  contactMethods,
  leadSources,
} from "@/lib/content/form-options"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const PH_MOBILE = /^(\+63|0)9\d{9}$/

type Errors = Partial<Record<"fullName" | "mobile" | "address" | "propertyType" | "contactMethod" | "consent", string>>

export function LeadForm({ defaultSolution }: { defaultSolution?: string }) {
  const [goals, setGoals] = React.useState<string[]>([])
  const [contactMethod, setContactMethod] = React.useState<string>("Call")
  const [consent, setConsent] = React.useState(false)
  const [errors, setErrors] = React.useState<Errors>({})
  const [status, setStatus] = React.useState<"idle" | "submitting" | "success">("idle")
  const [submitError, setSubmitError] = React.useState<string | null>(null)
  const [turnstileToken, setTurnstileToken] = React.useState("")

  const handleTurnstileVerify = React.useCallback((t: string) => setTurnstileToken(t), [])
  const handleTurnstileExpire = React.useCallback(() => setTurnstileToken(""), [])

  // Fire the `lead_form_start` conversion event once, on first interaction.
  const startedRef = React.useRef(false)
  function handleFirstInteraction() {
    if (startedRef.current) return
    startedRef.current = true
    track(ANALYTICS_EVENTS.leadFormStart)
  }

  function toggleGoal(goal: string) {
    setGoals((prev) =>
      prev.includes(goal) ? prev.filter((g) => g !== goal) : [...prev, goal],
    )
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const data = new FormData(form)

    const next: Errors = {}
    const fullName = String(data.get("fullName") ?? "").trim()
    const mobile = String(data.get("mobile") ?? "").trim().replace(/[\s-]/g, "")
    const address = String(data.get("addressCity") ?? "").trim()
    const propertyType = String(data.get("propertyType") ?? "")

    if (fullName.length < 2) next.fullName = "Please enter your name."
    if (!PH_MOBILE.test(mobile)) next.mobile = "Enter a valid PH mobile (09… or +63…)."
    if (!address) next.address = "City / Municipality is required."
    if (!propertyType) next.propertyType = "Select a property type."
    if (!contactMethod) next.contactMethod = "Choose how we should reach you."
    if (!consent) next.consent = "Please agree before we contact you."

    setErrors(next)
    if (Object.keys(next).length > 0) {
      // focus first invalid for keyboard/SR users
      const firstKey = Object.keys(next)[0]
      form.querySelector<HTMLElement>(`[data-field="${firstKey}"]`)?.focus()
      return
    }

    // When spam protection is configured, require a solved challenge before we
    // bother the server (which re-verifies the token regardless).
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
        body: JSON.stringify({
          fullName,
          mobile,
          email: String(data.get("email") ?? "").trim(),
          address: {
            barangay: String(data.get("addressBarangay") ?? ""),
            city: address,
            province: String(data.get("addressProvince") ?? ""),
          },
          propertyType,
          solutionInterest: String(data.get("solutionInterest") ?? ""),
          monthlyBill: String(data.get("monthlyBill") ?? ""),
          monthlyKwh: String(data.get("monthlyKwh") ?? ""),
          goals,
          utilityProvider: String(data.get("utilityProvider") ?? ""),
          leadSource: String(data.get("leadSource") ?? ""),
          siteNotes: String(data.get("siteNotes") ?? ""),
          contactMethod,
          turnstileToken,
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
          : "Something went wrong. Please try again, or contact us directly below.",
      )
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-2xl border bg-card p-8 text-center shadow-sm">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-primary/15 text-primary">
          <CheckCircle2 className="size-7" />
        </span>
        <h3 className="mt-5 text-xl font-semibold">Thank you — we&apos;ve got it.</h3>
        <p className="mx-auto mt-2 max-w-md text-muted-foreground text-pretty">
          A Solar Works adviser will review your details and reach out shortly to arrange
          your free assessment. Prefer to talk now?
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild>
            <a href={siteConfig.contact.viber.href}>
              <MessageCircle /> Chat on Viber
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href={siteConfig.contact.phone.href}>Call {siteConfig.contact.phone.value}</a>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form
      onSubmit={onSubmit}
      onFocusCapture={handleFirstInteraction}
      noValidate
      className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8"
    >
      <div className="grid gap-5">
        <Field label="Full name" required error={errors.fullName}>
          <Input name="fullName" data-field="fullName" autoComplete="name" placeholder="Juan Dela Cruz" />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Mobile number" required error={errors.mobile}>
            <Input name="mobile" data-field="mobile" inputMode="tel" autoComplete="tel" placeholder="0917 555 0142" />
          </Field>
          <Field label="Email" hint="optional">
            <Input name="email" type="email" autoComplete="email" placeholder="you@email.com" />
          </Field>
        </div>

        <Field label="Installation address" required error={errors.address} hint="Barangay / City / Province">
          <div className="grid gap-3 sm:grid-cols-3">
            <Input name="addressBarangay" aria-label="Barangay" placeholder="Barangay" />
            <Input name="addressCity" data-field="address" aria-label="City or Municipality" placeholder="City / Municipality" />
            <Input name="addressProvince" aria-label="Province" placeholder="Province" />
          </div>
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Property type" required error={errors.propertyType}>
            <Select name="propertyType">
              <SelectTrigger data-field="propertyType" className="w-full">
                <SelectValue placeholder="Select property type" />
              </SelectTrigger>
              <SelectContent>
                {propertyTypes.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Preferred solution" hint="optional">
            <Select name="solutionInterest" defaultValue={defaultSolution}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Not sure yet" />
              </SelectTrigger>
              <SelectContent>
                {solutionInterests.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Average monthly bill (PHP)" hint="bill or kWh helps us size it">
            <Input name="monthlyBill" inputMode="numeric" placeholder="e.g. 8,000" />
          </Field>
          <Field label="Average monthly consumption (kWh)" hint="optional">
            <Input name="monthlyKwh" inputMode="numeric" placeholder="e.g. 450" />
          </Field>
        </div>

        <Field label="Primary goal" hint="select all that apply">
          <div className="flex flex-wrap gap-2">
            {primaryGoals.map((goal) => {
              const active = goals.includes(goal)
              return (
                <button
                  key={goal}
                  type="button"
                  onClick={() => toggleGoal(goal)}
                  aria-pressed={active}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                    "active:scale-[0.97] motion-safe:transition-transform",
                    active
                      ? "border-primary bg-primary/10 text-foreground"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {goal}
                </button>
              )
            })}
          </div>
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Electricity provider" hint="optional">
            <Select name="utilityProvider">
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                {utilityProviders.map((u) => (
                  <SelectItem key={u} value={u}>{u}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="How did you hear about us?" hint="optional">
            <Select name="leadSource">
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select one" />
              </SelectTrigger>
              <SelectContent>
                {leadSources.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field label="Roof / site notes" hint="optional">
          <Textarea name="siteNotes" rows={3} placeholder="Roof type, available space, property stage, special requirements…" />
        </Field>

        <Field label="Preferred contact method" required error={errors.contactMethod}>
          <RadioGroup
            value={contactMethod}
            onValueChange={setContactMethod}
            className="flex flex-wrap gap-x-6 gap-y-2"
            data-field="contactMethod"
          >
            {contactMethods.map((m) => (
              <Label key={m} className="flex cursor-pointer items-center gap-2 font-normal">
                <RadioGroupItem value={m} /> {m}
              </Label>
            ))}
          </RadioGroup>
        </Field>

        <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-4">
          <Checkbox
            id="consent"
            checked={consent}
            onCheckedChange={(v) => setConsent(v === true)}
            data-field="consent"
            className="mt-0.5"
          />
          <Label htmlFor="consent" className="text-sm font-normal leading-relaxed">
            I agree to let {siteConfig.name} contact me and store my information for assessment
            purposes, as described in the{" "}
            <a href="/privacy" className="font-medium text-primary-strong underline-offset-2 hover:underline">
              Privacy Notice
            </a>
            .
          </Label>
        </div>
        {errors.consent ? (
          <p className="-mt-2 text-sm text-destructive">{errors.consent}</p>
        ) : null}

        {/* Spam protection (NFR-02). Cloudflare Turnstile renders here when a
            site key is configured; otherwise this collapses to nothing. */}
        {TURNSTILE_SITE_KEY ? (
          <Turnstile onVerify={handleTurnstileVerify} onExpire={handleTurnstileExpire} />
        ) : (
          <div className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-4" />
            Protected by Cloudflare Turnstile
          </div>
        )}

        {submitError ? (
          <p role="alert" className="-mb-1 text-sm text-destructive">
            {submitError}
          </p>
        ) : null}

        <Button type="submit" size="lg" disabled={status === "submitting"} className="w-full">
          {status === "submitting" ? (
            <>
              <Loader2 className="animate-spin" /> Sending…
            </>
          ) : (
            "Request my free assessment"
          )}
        </Button>
      </div>
    </form>
  )
}

function Field({
  label,
  hint,
  required,
  error,
  children,
}: {
  label: string
  hint?: string
  required?: boolean
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <Label className="text-sm">
          {label}
          {required ? <span className="ml-0.5 text-primary">*</span> : null}
        </Label>
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </div>
      {children}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
