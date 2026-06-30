import { redirect } from "next/navigation"

import { getSession } from "@/lib/session"
import { googleEnabled } from "@/lib/env"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { SignupForm } from "@/components/auth/signup-form"

export const metadata = { title: "Create account" }

export default async function SignupPage() {
  const session = await getSession()
  if (session) redirect("/")

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Create your account</CardTitle>
        <CardDescription>
          Track your solar assessment, quotes, and installation.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SignupForm googleEnabled={googleEnabled} />
      </CardContent>
    </Card>
  )
}
