import { Suspense } from "react"
import { redirect } from "next/navigation"

import { getSession } from "@/lib/session"
import { BrandMark } from "@/components/brand"
import { LoginForm } from "@/components/auth/login-form"

export const metadata = { title: "Sign in" }

export default async function LoginPage() {
  const session = await getSession()
  if (session) redirect("/")

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <BrandMark className="size-14" />
        <h1 className="font-heading text-2xl font-extrabold tracking-tight text-primary-strong">
          LOGIN
        </h1>
      </div>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </div>
  )
}
