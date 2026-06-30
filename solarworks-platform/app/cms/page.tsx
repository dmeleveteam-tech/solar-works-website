import { PageHeading } from "@/components/app-shell"
import { Card, CardContent } from "@/components/ui/card"

export const metadata = { title: "Content" }

export default function CmsPage() {
  return (
    <>
      <PageHeading
        title="Content"
        description="Edit testimonials, projects, FAQs, and learning-center articles."
      />
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Editable content collections land here in Phase 3, backed by MongoDB.
        </CardContent>
      </Card>
    </>
  )
}
