"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { LogOut, Loader2 } from "lucide-react"

import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"

export function SignOutButton() {
  const router = useRouter()
  const [pending, setPending] = React.useState(false)

  async function onClick() {
    setPending(true)
    await authClient.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <Button variant="ghost" size="sm" onClick={onClick} disabled={pending}>
      {pending ? <Loader2 className="animate-spin" /> : <LogOut />}
      <span className="hidden sm:inline">Sign out</span>
    </Button>
  )
}
