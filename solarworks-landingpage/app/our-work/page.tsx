import type { Metadata } from "next"

import { Container, Section } from "@/components/section"
import { PageHero } from "@/components/page-hero"
import { ProjectGallery } from "@/components/project-gallery"
import { CtaBand } from "@/components/sections/cta-band"

export const metadata: Metadata = {
  title: "Our Work & Projects",
  description:
    "Real Solar Works installations across homes, businesses, and farms — with capacity, location, and outcomes.",
}

export default function OurWorkPage() {
  return (
    <>
      <PageHero
        eyebrow="Our work"
        title={
          <>
            Installations <span className="word-soft">you can stand behind</span>
          </>
        }
        description="Browse real projects across homes, businesses, and farms. Filter by the type that's most like yours."
      />
      <Section>
        <Container>
          <ProjectGallery />
        </Container>
      </Section>
      <CtaBand
        title="Want results like these?"
        description="Tell us about your property and we'll show you what's possible — grounded in your real consumption."
      />
    </>
  )
}
