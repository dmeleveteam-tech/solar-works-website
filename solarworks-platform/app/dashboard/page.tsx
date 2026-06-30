import { PageHeading } from "@/components/app-shell"
import { LeadsManager } from "@/components/dashboard/leads-manager"
import { requireRole } from "@/lib/session"
import { listLeads, listAssignees } from "@/lib/leads"

export const metadata = { title: "Leads" }

export default async function StaffDashboardPage() {
  const session = await requireRole("staff", "superadmin")
  const [leads, assignees] = await Promise.all([listLeads(), listAssignees()])

  return (
    <>
      <PageHeading
        title="Leads"
        description="Incoming enquiries from the website form, chatbot, and manual entry."
      />
      <LeadsManager
        initialLeads={leads}
        assignees={assignees}
        canDelete={session.user.role === "superadmin"}
      />
    </>
  )
}
