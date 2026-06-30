import { PageHeading } from "@/components/app-shell"
import { Card, CardContent } from "@/components/ui/card"

export const metadata = { title: "Leads" }

export default function StaffDashboardPage() {
  return (
    <>
      <PageHeading
        title="Leads"
        description="Incoming enquiries from the website form and chatbot."
      />
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          The lead inbox lands here in Phase 2 — list, filter, assign, and update
          status on enquiries stored in MongoDB.
        </CardContent>
      </Card>
    </>
  )
}
