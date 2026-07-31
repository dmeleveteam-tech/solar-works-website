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

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const email = String(data.get("email") ?? "").trim()
    const password = String(data.get("password") ?? "")

    if (!email || !password) {
      toast.error("Email and password are required.")
      return
    }
    if (!EMAIL_PATTERN.test(email)) {
      toast.error("Enter a valid email address.")
      return
    }

    setPending(true)
    const { error } = await authClient.signIn.email({ email, password })
    setPending(false)

    if (error) {
      toast.error(error.message ?? "Could not sign you in. Check your details.")
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

        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() =>
              toast("Contact your admin to reset your password.")
            }
            className="text-xs font-medium text-primary-strong hover:underline"
          >
            Forgot Password?
          </button>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-sm transition-colors hover:bg-primary/80 disabled:pointer-events-none disabled:opacity-60"
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            LOGIN
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
