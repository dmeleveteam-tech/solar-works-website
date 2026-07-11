import { requireRole } from "@/lib/session"
import { listProjectsForCustomer } from "@/lib/customer-projects"
import { PageHeading } from "@/components/app-shell"
import { CustomerProjectView } from "@/components/portal/customer-project-view"
import { Card, CardContent } from "@/components/ui/card"

export const metadata = { title: "Your portal" }

export default async function PortalPage() {
  const session = await requireRole("customer", "superadmin")
  const firstName = (session.user.name || "there").split(" ")[0]

  // Owner-scoped read: customers only ever see their own projects.
  const projects = await listProjectsForCustomer(session.user.id)

  return (
    <>
      <PageHeading
        title={`Welcome, ${firstName}`}
        description="Track your installation status and view the documents we've shared."
      />

      {projects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Your project isn&apos;t set up yet. Once our team has reviewed your
            assessment, your installation status and documents will appear here.
          </CardContent>
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
