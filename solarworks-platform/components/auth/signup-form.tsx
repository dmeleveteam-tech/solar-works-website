"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Loader2, Lock, Mail, User as UserIcon } from "lucide-react"
import { toast } from "sonner"

import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { IconField } from "@/components/auth/icon-field"

export function SignupForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)
  const [googlePending, setGooglePending] = React.useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const name = String(data.get("name") ?? "").trim()
    const email = String(data.get("email") ?? "").trim()
    const password = String(data.get("password") ?? "")

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.")
      return
    }

    setPending(true)
    // New public sign-ups are always customers (server enforces defaultRole).
    const { error } = await authClient.signUp.email({ name, email, password })
    setPending(false)

    if (error) {
      toast.error(error.message ?? "Could not create your account.")
      return
    }
    router.push("/portal")
    router.refresh()
  }

  async function onGoogle() {
    setGooglePending(true)
    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: "/portal",
    })
    if (error) {
      setGooglePending(false)
      toast.error(error.message ?? "Google sign-up failed.")
    }
  }

  return (
    <div className="grid gap-5">
      <form onSubmit={onSubmit} className="grid gap-6">
        <IconField
          icon={UserIcon}
          id="name"
          name="name"
          autoComplete="name"
          required
          placeholder="Full name"
        />
        <IconField
          icon={Mail}
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
          autoComplete="new-password"
          required
          minLength={8}
          placeholder="At least 8 characters"
        />
        <Button type="submit" size="lg" disabled={pending} className="w-full rounded-full">
          {pending ? (
            <>
              <Loader2 className="animate-spin" /> Creating account…
            </>
          ) : (
            "Create account"
          )}
        </Button>
      </form>

      {googleEnabled ? (
        <>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={onGoogle}
            disabled={googlePending}
            className="w-full"
          >
            {googlePending ? <Loader2 className="animate-spin" /> : null}
            Continue with Google
          </Button>
        </>
      ) : null}

      <p className="text-center text-sm text-muted-foreground lg:hidden">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-primary-strong underline-offset-2 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}
