import type { Metadata } from "next"

import { Container, Section } from "@/components/section"
import { PageHero } from "@/components/page-hero"
import { StoriesExplorer } from "@/components/stories-explorer"
import { CtaBand } from "@/components/sections/cta-band"
import { getTestimonials } from "@/lib/content/api"

export const metadata: Metadata = {
  title: "Customer Stories",
  description:
    "Video and written testimonials from Solar Works customers — filter by residential, commercial, or farm.",
}

export default async function CustomerStoriesPage() {
  const { video, written } = await getTestimonials()
  return (
    <>
      <PageHero
        eyebrow="Customer stories"
        title={
          <>
            Proof, <span className="word-soft">in their own words</span>
          </>
        }
        description="Every story here is from a real client who consented to share it. Browse by the kind of property most like yours."
      />
      <Section>
        <Container>
          <StoriesExplorer
            videoTestimonials={video}
            writtenTestimonials={written}
          />
        </Container>
      </Section>
      <CtaBand
        title="Talk to a Solar Adviser"
        description="Want to speak with a past client or see a project near you? Ask us — we're happy to connect you."
      />
    </>
  )
}
