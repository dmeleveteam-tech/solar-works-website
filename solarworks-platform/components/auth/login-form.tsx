"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter()
  const params = useSearchParams()
  const redirectTo = params.get("redirectTo") || "/"
  const [pending, setPending] = React.useState(false)
  const [googlePending, setGooglePending] = React.useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const data = new FormData(e.currentTarget)
    const email = String(data.get("email") ?? "").trim()
    const password = String(data.get("password") ?? "")

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

  async function onGoogle() {
    setGooglePending(true)
    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: redirectTo,
    })
    if (error) {
      setGooglePending(false)
      toast.error(error.message ?? "Google sign-in failed.")
    }
  }

  return (
    <div className="grid gap-5">
      <form onSubmit={onSubmit} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@email.com"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
          />
        </div>
        <Button type="submit" size="lg" disabled={pending} className="w-full">
          {pending ? (
            <>
              <Loader2 className="animate-spin" /> Signing in…
            </>
          ) : (
            "Sign in"
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

      <p className="text-center text-sm text-muted-foreground">
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
