import { SunMedium } from "lucide-react"

import { requireRole } from "@/lib/session"
import { listProjectsForCustomer } from "@/lib/customer-projects"
import { CustomerProjectView } from "@/components/portal/customer-project-view"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"

export const metadata = { title: "Your portal" }

export default async function PortalPage() {
  const session = await requireRole("customer", "superadmin")
  const firstName = (session.user.name || "there").split(" ")[0]

  // Owner-scoped read: customers only ever see their own projects.
  const projects = await listProjectsForCustomer(session.user.id)

  return (
    <>
      {/* The customer-facing header carries the brand warmth the staff screens
          don't need — this is the page a paying customer lands on. */}
      <div className="relative grain bg-solar-hero -mx-4 mb-6 border-b px-4 pt-8 pb-9 md:-mx-6 md:px-6">
        <p className="section-label">Solar Works</p>
        <h1 className="text-display mt-2 text-3xl">Welcome, {firstName}</h1>
        <p className="mt-2 max-w-[52ch] text-sm text-pretty text-muted-foreground">
          Track where your installation stands and open the documents your
          adviser has shared with you.
        </p>
      </div>

      {projects.length === 0 ? (
        <Card>
          <EmptyState
            icon={SunMedium}
            title="Your installation is still being set up"
            description="Once our team has finished reviewing your assessment, your progress and documents will appear here. We will email you as soon as there is an update."
          />
        </Card>
      ) : (
        <div className="grid gap-8">
          {projects.map((project) => (
            <CustomerProjectView key={project.id} project={project} />
          ))}
        </div>
      )}
    </>
  )
}
