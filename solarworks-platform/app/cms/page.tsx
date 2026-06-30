import { requireRole } from "@/lib/session"
import { PageHeading } from "@/components/app-shell"
import { ContentManager } from "@/components/cms/content-manager"
import { listProjects, listTestimonials, listFaqs } from "@/lib/content"

export const metadata = { title: "Content" }

export default async function CmsPage() {
  await requireRole("content_editor", "superadmin")
  const [projects, testimonials, faqs] = await Promise.all([
    listProjects(),
    listTestimonials(),
    listFaqs(),
  ])

  return (
    <>
      <PageHeading
        title="Content"
        description="Manage the testimonials, projects, and FAQs shown on the public website. Only published items appear live."
      />
      <ContentManager projects={projects} testimonials={testimonials} faqs={faqs} />
    </>
  )
}
