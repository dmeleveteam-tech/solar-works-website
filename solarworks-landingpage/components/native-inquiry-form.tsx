"use client"

import * as React from "react"
import { CheckCircle2, ExternalLink, Loader2, ShieldCheck, MessageCircle, Star, UploadCloud, X, FileText } from "lucide-react"

import { cn } from "@/lib/utils"
import { siteConfig } from "@/lib/site-config"
import { track, ANALYTICS_EVENTS } from "@/lib/analytics"
import { getAttribution } from "@/lib/attribution"
import { MESSENGER_HREF } from "@/lib/messenger"
import { Turnstile, TURNSTILE_SITE_KEY } from "@/components/turnstile"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

/* ── Field options matching the Google Form ─────────────────── */
const billRanges = [
  "Less than Php 7,000.00",
  "Php 7,000.00 – 10,000.00",
  "Php 10,000.00 – 14,000.00",
  "Php 14,000.00 – 18,000.00",
  "Php 18,000.00 – 22,000.00",
  "Php 22,000.00 – 26,000.00",
  "Php 26,000.00 – 30,000.00",
  "Php 30,000.00 – 50,000.00",
  "Above Php 50,000.00",
]

const usageProfiles = [
  "50%+ daytime-heavy electricity usage",
  "60/40% daytime vs 30-40% nighttime usage",
  "Relatively even daytime to nighttime usage",
  "30-50% daytime vs 50-60% nighttime usage",
  "15% and up nighttime-heavy electricity usage",
]

const structureTypes = [
  "Residential: Single Family Home",
  "Residential: Multi-Family Dwelling (Duplex, Apartment Building)",
  "Commercial: Businesses / Offices",
  "Industrial / Warehouse",
  "Agricultural (Farm, Barn, Greenhouse)",
  "Other",
]

const batteryOptions = [
  "Yes, definitely",
  "Maybe, I'd like more information",
  "No, not at this time",
]

/* ── Validation types ───────────────────────────────────────── */
type Errors = Partial<
  Record<
    "fullName" | "email" | "phone" | "address" | "billRange" | "usageProfile" | "structureType" | "battery",
    string
  >
>

/* ── Star urgency rating ────────────────────────────────────── */
function StarRating({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  const [hovered, setHovered] = React.useState<number | null>(null)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => {
          const filled = (hovered ?? value) >= n
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              onMouseEnter={() => setHovered(n)}
              onMouseLeave={() => setHovered(null)}
              className="group p-0.5 transition-transform active:scale-90"
              aria-label={`Rate urgency ${n} out of 5`}
            >
              <Star
                className={cn(
                  "size-7 transition-colors",
                  filled
                    ? "fill-amber-400 text-amber-400"
                    : "fill-muted text-muted-foreground/30 group-hover:text-amber-300",
                )}
              />
            </button>
          )
        })}
      </div>
      <div className="flex justify-between text-[11px] text-muted-foreground">
        <span>0 = ASAP</span>
        <span>5 = 12+ months</span>
      </div>
    </div>
  )
}

/* ── Main form ──────────────────────────────────────────────── */
/* ── Bill upload component ──────────────────────────────────── */
const MAX_FILE_BYTES = 10 * 1024 * 1024 // 10 MB

function BillUpload({
  file,
  onFile,
  error,
}: {
  file: File | null
  onFile: (f: File | null) => void
  error?: string
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = React.useState(false)
  const [sizeError, setSizeError] = React.useState("")

  function pick(picked: File | null | undefined) {
    if (!picked) return
    if (picked.size > MAX_FILE_BYTES) {
      setSizeError("File is too large. Maximum size is 10 MB.")
      return
    }
    setSizeError("")
    onFile(picked)
  }

  const displayError = error || sizeError

  return (
    <div className="grid gap-2">
      {file ? (
        <div className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
            <FileText className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</p>
          </div>
          <button
            type="button"
            onClick={() => { onFile(null); setSizeError("") }}
            className="grid size-7 place-items-center rounded-full hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
            aria-label="Remove file"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            pick(e.dataTransfer.files[0])
          }}
          className={cn(
            "flex flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors",
            dragging
              ? "border-primary bg-primary/5 text-primary"
              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/40 text-muted-foreground",
          )}
        >
          <UploadCloud className="size-8" />
          <div>
            <p className="text-sm font-medium">Click to upload or drag &amp; drop</p>
            <p className="mt-0.5 text-xs">Images or PDF · Max 10 MB</p>
          </div>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="sr-only"
        onChange={(e) => pick(e.target.files?.[0])}
      />
      {displayError && <p className="text-sm text-destructive">{displayError}</p>}
    </div>
  )
}

export function NativeInquiryForm({ defaultSolution }: { defaultSolution?: string }) {
  const [urgency, setUrgency] = React.useState(0)
  const [billFile, setBillFile] = React.useState<File | null>(null)
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

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const data = new FormData(form)

    const next: Errors = {}
    const fullName = String(data.get("fullName") ?? "").trim()
    const email = String(data.get("email") ?? "").trim()
    const phone = String(data.get("phone") ?? "").trim()
    const address = String(data.get("address") ?? "").trim()
    const billRange = String(data.get("billRange") ?? "")
    const usageProfile = String(data.get("usageProfile") ?? "")
    const structureType = String(data.get("structureType") ?? "")
    const battery = String(data.get("battery") ?? "")

    if (fullName.length < 2) next.fullName = "Please enter your full name."
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = "Enter a valid email address."
    if (!phone) next.phone = "Primary contact phone number is required."
    if (!address) next.address = "Installation address is required."
    if (!billRange) next.billRange = "Please select your monthly bill range."
    if (!usageProfile) next.usageProfile = "Please select your usage profile."
    if (!structureType) next.structureType = "Please select the structure type."
    if (!battery) next.battery = "Please select a battery storage option."

    setErrors(next)
    if (Object.keys(next).length > 0) {
      const firstKey = Object.keys(next)[0]
      form.querySelector<HTMLElement>(`[data-field="${firstKey}"]`)?.focus()
      return
    }

    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      setSubmitError("Please complete the spam-protection check above.")
      return
    }

    setStatus("submitting")
    setSubmitError(null)

    const contactTime = String(data.get("contactTime") ?? "").trim()
    const contactAmPm = String(data.get("contactAmPm") ?? "")

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        // Every answer goes over as its own field. They used to be concatenated
        // into one free-text note, which arrived in the inbox as an unlabelled
        // blob; the adviser reading the lead needs them as separate rows.
        body: JSON.stringify({
          fullName,
          email,
          mobile: phone,
          address: { city: address },
          propertyType: structureType,
          solutionInterest: defaultSolution ?? "",
          monthlyBill: billRange,
          usageProfile,
          batteryInterest: battery,
          urgency: urgency ? `${urgency} of 5 (1 = ASAP)` : "",
          contactTime: contactTime ? `${contactTime} ${contactAmPm}` : "",
          billAttachment: billFile
            ? `${billFile.name} (${(billFile.size / 1024).toFixed(0)} KB)`
            : "",
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
      <div className="rounded-2xl border bg-card p-8 text-center shadow-sm">
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

  return (
    <form
      onSubmit={onSubmit}
      onFocusCapture={handleFirstInteraction}
      noValidate
      className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8"
    >
      <div className="grid gap-6">
        {/* Email */}
        <Field label="Email" required error={errors.email}>
          <Input
            name="email"
            type="email"
            data-field="email"
            autoComplete="email"
            placeholder="your@email.com"
          />
        </Field>

        {/* Full Name */}
        <Field label="Full Name" required error={errors.fullName}>
          <Input
            name="fullName"
            data-field="fullName"
            autoComplete="name"
            placeholder="Juan Dela Cruz"
          />
        </Field>

        {/* Installation Address */}
        <Field label="Installation Address" required error={errors.address}>
          <Input
            name="address"
            data-field="address"
            autoComplete="street-address"
            placeholder="Barangay, City, Province"
          />
        </Field>

        {/* Phone */}
        <Field label="Primary Contact Phone Number" required error={errors.phone}>
          <Input
            name="phone"
            data-field="phone"
            inputMode="tel"
            autoComplete="tel"
            placeholder="0917 555 0142"
          />
        </Field>

        {/* Monthly Bill Range */}
        <Field
          label="What is your monthly electricity bill range in the last 6 months?"
          required
          error={errors.billRange}
        >
          <RadioGroup name="billRange" data-field="billRange" className="grid gap-2 pt-1">
            {billRanges.map((r) => (
              <Label
                key={r}
                className="flex cursor-pointer items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3 text-sm font-normal transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
              >
                <RadioGroupItem value={r} />
                {r}
              </Label>
            ))}
          </RadioGroup>
        </Field>

        {/* Usage Profile */}
        <Field
          label="What is your daytime vs nighttime electricity usage?"
          required
          error={errors.usageProfile}
        >
          <RadioGroup name="usageProfile" data-field="usageProfile" className="grid gap-2 pt-1">
            {usageProfiles.map((u) => (
              <Label
                key={u}
                className="flex cursor-pointer items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3 text-sm font-normal transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
              >
                <RadioGroupItem value={u} />
                {u}
              </Label>
            ))}
          </RadioGroup>
        </Field>

        {/* Urgency */}
        <Field
          label="How would you rate your urgency for installing solar panels?"
          hint="1 = ASAP · 5 = 12+ months"
        >
          <StarRating value={urgency} onChange={setUrgency} />
        </Field>

        {/* Structure Type */}
        <Field
          label="What is the primary usage of the structure?"
          required
          error={errors.structureType}
        >
          <RadioGroup name="structureType" data-field="structureType" className="grid gap-2 pt-1">
            {structureTypes.map((s) => (
              <Label
                key={s}
                className="flex cursor-pointer items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3 text-sm font-normal transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
              >
                <RadioGroupItem value={s} />
                {s}
              </Label>
            ))}
          </RadioGroup>
        </Field>

        {/* Battery Storage */}
        <Field
          label="Are you interested in adding a solar battery storage solution?"
          required
          error={errors.battery}
        >
          <RadioGroup name="battery" data-field="battery" className="grid gap-2 pt-1">
            {batteryOptions.map((b) => (
              <Label
                key={b}
                className="flex cursor-pointer items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3 text-sm font-normal transition-colors has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
              >
                <RadioGroupItem value={b} />
                {b}
              </Label>
            ))}
          </RadioGroup>
        </Field>

        {/* Best contact time */}
        <Field label="What is the best time-range for us to contact you?" hint="optional">
          <div className="flex items-center gap-2">
            <Input
              name="contactTime"
              type="time"
              className="w-36"
              aria-label="Contact time"
            />
            <select
              name="contactAmPm"
              className="h-9 rounded-md border bg-background px-3 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-primary"
              aria-label="AM or PM"
            >
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </div>
        </Field>

        {/* Electricity bill upload */}
        <Field
          label="Upload your most recent electricity bill"
          hint="optional · for usage analysis"
        >
          <BillUpload file={billFile} onFile={setBillFile} />
        </Field>

        {/* Spam protection */}
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
            "Submit Inquiry"
          )}
        </Button>
      </div>
    </form>
  )
}

/* ── Field wrapper ──────────────────────────────────────────── */
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
      <div className="flex flex-wrap items-baseline justify-between gap-1">
        <Label className="text-sm leading-snug">
          {label}
          {required ? <span className="ml-0.5 text-destructive">*</span> : null}
        </Label>
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </div>
      {children}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
