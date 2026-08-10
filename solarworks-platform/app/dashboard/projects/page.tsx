import { PageHeading } from "@/components/app-shell"
import { ProjectsManager } from "@/components/projects/projects-manager"
import { requireRole } from "@/lib/session"
import { listAllProjects } from "@/lib/customer-projects"

export const metadata = { title: "Customer projects" }

export default async function CustomerProjectsPage() {
  const session = await requireRole("staff", "superadmin")
  const projects = await listAllProjects()

  
  
  return (
    <>
      <PageHeading
        title="Customer projects"
        description="Track a customer's installation status and shared documents."
      />
      <ProjectsManager
        initialProjects={projects}
        canDelete={session.user.role === "superadmin"}
      />
    </>
  )
}
