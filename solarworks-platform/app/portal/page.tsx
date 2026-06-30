import { requireRole } from "@/lib/session"
import { PageHeading } from "@/components/app-shell"
import { Card, CardContent } from "@/components/ui/card"

export const metadata = { title: "Your portal" }

export default async function PortalPage() {
  const session = await requireRole("customer", "superadmin")
  const firstName = (session.user.name || "there").split(" ")[0]

  return (
    <>
      <PageHeading
        title={`Welcome, ${firstName}`}
        description="Track your solar assessment, quotes, and installation progress."
      />
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Your assessment status, quotes, and install timeline land here in
          Phase 3.
        </CardContent>
      </Card>
    </>
  )
}
