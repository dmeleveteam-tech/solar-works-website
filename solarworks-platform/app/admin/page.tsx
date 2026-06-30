import Link from "next/link"
import { headers } from "next/headers"
import { Users, Inbox, FileText } from "lucide-react"

import { auth } from "@/lib/auth"
import { PageHeading } from "@/components/app-shell"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata = { title: "Admin" }

export default async function AdminOverviewPage() {
  let totalUsers: number | null = null
  try {
    const res = await auth.api.listUsers({
      headers: await headers(),
      query: { limit: 1 },
    })
    totalUsers = res.total ?? null
  } catch {
    // DB not reachable yet (e.g. placeholder MONGODB_URI) — show a dash.
    totalUsers = null
  }

  return (
    <>
      <PageHeading
        title="Admin"
        description="Manage users, leads, and content across Solar Works."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/admin/users">
          <Card className="h-full">
            <CardHeader>
              <Users className="size-5 text-primary-strong" />
              <CardTitle className="mt-2">Users</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              <span className="text-2xl font-bold text-foreground">
                {totalUsers ?? "—"}
              </span>{" "}
              total · create, assign roles, ban
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard">
          <Card className="h-full">
            <CardHeader>
              <Inbox className="size-5 text-primary-strong" />
              <CardTitle className="mt-2">Leads</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              Website + chatbot enquiries (Phase 2)
            </CardContent>
          </Card>
        </Link>
        <Link href="/cms">
          <Card className="h-full">
            <CardHeader>
              <FileText className="size-5 text-primary-strong" />
              <CardTitle className="mt-2">Content</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">
              Testimonials, projects, FAQs (Phase 3)
            </CardContent>
          </Card>
        </Link>
      </div>
    </>
  )
}
