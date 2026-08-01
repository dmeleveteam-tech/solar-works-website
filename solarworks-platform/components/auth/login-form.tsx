"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Loader2, Lock, User } from "lucide-react"
import { toast } from "sonner"

import { authClient } from "@/lib/auth-client"
import { IconField } from "@/components/auth/icon-field"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const redirectTo = params.get("redirectTo") || "/"
  const [pending, setPending] = React.useState(false)
  // Validation belongs next to the field it describes. A toast that fades after
  // four seconds is the wrong place to tell someone their email is malformed —
  // by the time they look back at the input, the reason is gone.
  const [error, setError] = React.useState<string | null>(null)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const email = String(data.get("email") ?? "").trim()
    const password = String(data.get("password") ?? "")

    setError(null)

    if (!email || !password) {
      setError("Enter both your email and password.")
      return
    }
    if (!EMAIL_PATTERN.test(email)) {
      setError("That doesn't look like a valid email address.")
      return
    }

    setPending(true)
    const { error: signInError } = await authClient.signIn.email({
      email,
      password,
    })
    setPending(false)

    if (signInError) {
      setError(
        signInError.message ?? "We couldn't sign you in. Check your details.",
      )
      return
    }
    // Root route fans out to the correct home for the user's role.
    router.push(redirectTo)
    router.refresh()
  }

  return (
    <div className="grid gap-6">
      <form onSubmit={onSubmit} noValidate className="grid gap-6">
        <IconField
          icon={User}
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="Email"
        />
        <IconField
          icon={Lock}
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="Password"
        />

        {error ? (
          <p
            role="alert"
            className="rounded-md bg-destructive/8 px-3 py-2 text-sm text-destructive ring-1 ring-destructive/20"
          >
            {error}
          </p>
        ) : null}

        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => toast("Contact your admin to reset your password.")}
            className="rounded-sm text-xs font-medium text-primary-strong underline-offset-2 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Forgot password?
          </button>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-7 py-2.5 text-sm font-semibold text-primary-foreground shadow-e1 transition-[background-color,box-shadow,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] outline-none hover:bg-primary/85 hover:shadow-e2 focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {pending ? "Signing in" : "Log in"}
          </button>
        </div>
      </form>

      <p className="text-center text-sm text-muted-foreground lg:hidden">
        New customer?{" "}
        <Link
          href="/signup"
          className="font-medium text-primary-strong underline-offset-2 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </div>
  )
}
