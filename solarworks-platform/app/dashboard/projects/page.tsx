import { PageHeading } from "@/components/app-shell"
import { ProjectsManager } from "@/components/projects/projects-manager"
import { requireRole } from "@/lib/session"
import { listAllProjects, listLinkableCustomers } from "@/lib/customer-projects"

export const metadata = { title: "Customer projects" }

export default async function CustomerProjectsPage() {
  const session = await requireRole("staff", "superadmin")
  const [projects, customers] = await Promise.all([
    listAllProjects(),
    listLinkableCustomers(),
  ])

  return (
    <>
      <PageHeading
        title="Customer projects"
        description="Give customers portal access to their installation status and documents."
      />
      <ProjectsManager
        initialProjects={projects}
        customers={customers}
        canDelete={session.user.role === "superadmin"}
      />
    </>
  )
}
