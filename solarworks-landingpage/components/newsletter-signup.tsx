"use client"

import * as React from "react"
import { ArrowRight } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

// Conservative email shape check. Real delivery is wired to a provider later.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function NewsletterSignup() {
  const [email, setEmail] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const value = email.trim()
    if (!EMAIL_RE.test(value)) {
      setError("Please enter a valid email address.")
      return
    }
    setError(null)
    // TODO: wire to an email provider / CRM. We intentionally store/send nothing here.
    toast.success("You're on the list — we'll be in touch with solar tips.")
    setEmail("")
  }

  return (
    <form onSubmit={onSubmit} noValidate className="w-full max-w-sm">
      <label htmlFor="newsletter-email" className="text-sm font-medium">
        Solar tips, no spam
      </label>
      <p className="mt-1 text-sm text-muted-foreground">
        Occasional guides on saving more with solar.
      </p>
      <div className="mt-3 flex gap-2">
        <Input
          id="newsletter-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@email.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (error) setError(null)
          }}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? "newsletter-error" : undefined}
        />
        <Button type="submit" variant="dark" aria-label="Subscribe">
          <ArrowRight />
        </Button>
      </div>
      {error ? (
        <p id="newsletter-error" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </form>
  )
}
