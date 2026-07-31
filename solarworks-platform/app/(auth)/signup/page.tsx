import { redirect } from "next/navigation"

import { getSession } from "@/lib/session"
import { googleEnabled } from "@/lib/env"
import { BrandMark } from "@/components/brand"
import { SignupForm } from "@/components/auth/signup-form"

export const metadata = { title: "Create account" }

export default async function SignupPage() {
  const session = await getSession()
  if (session) redirect("/")

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <BrandMark className="size-14" />
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-primary-strong">
          SIGN UP
        </h1>
        <p className="text-sm text-muted-foreground">
          Track your solar assessment, quotes, and installation.
        </p>
      </div>
      <SignupForm googleEnabled={googleEnabled} />
    </div>
  )
}
