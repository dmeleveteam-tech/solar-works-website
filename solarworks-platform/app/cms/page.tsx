import { requireRole } from "@/lib/session"
import { PageHeading } from "@/components/app-shell"
import { ContentManager } from "@/components/cms/content-manager"
import { listProjects, listTestimonials, listFaqs, listSolutions } from "@/lib/content"

export const metadata = { title: "Content" }

export default async function CmsPage() {
  await requireRole("content_editor", "superadmin")
  const [projects, testimonials, faqs, solutions] = await Promise.all([
    listProjects(),
    listTestimonials(),
    listFaqs(),
    listSolutions(),
  ])

  return (
    <>
      <PageHeading
        eyebrow="Marketing site"
        title="Content"
        description="Manage the testimonials, projects, solutions, and FAQs shown on the public website. Only published items appear live."
      />
      <ContentManager
        projects={projects}
        testimonials={testimonials}
        faqs={faqs}
        solutions={solutions}
      />
    </>
  )
}
