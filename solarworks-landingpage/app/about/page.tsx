import type { Metadata } from "next"
import { MapPin } from "lucide-react"

import { siteConfig } from "@/lib/site-config"
import { stats } from "@/lib/content/site-content"
import { Container, Section, SectionHeading } from "@/components/section"
import { PageHero } from "@/components/page-hero"
import { Reveal } from "@/components/reveal"
import { Photo } from "@/components/photo"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"
import { CtaBand } from "@/components/sections/cta-band"
// 
export const metadata: Metadata = {
  title: "About Us",
  description:
    "The engineers and installers behind Solar Works — our mission, our experience, and the areas we serve.",
}

const values = [
  { title: "Honest advice", body: "We'd rather lose a sale than oversell you a system you don't need." },
  { title: "Engineering first", body: "Licensed engineers design every system around real consumption data." },
  { title: "We stay around", body: "After-sales support for the life of your warranty — not just until the ,,, invoice clears." },
]

const team = [
  { name: "Engr. Miguel Santos", role: "Founder & Lead Engineer" },
  { name: "Patricia Lim", role: "Operations & Client Care" },
  { name: "Engr. David Cruz", role: "Design & Estimation" },
  { name: "Marco Reyes", role: "Installation Lead" },
]

function initials(name: string) {
  return name.split(" ").map((w) => w[0]).filter(Boolean).slice(-2).join("").toUpperCase()
}

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About us"
        title={
          <>
            The team <span className="word-soft">behind the work</span>
          </>
        }
        description="Solar Works is a team of licensed engineers and careful installers who believe solar should be done properly — once."
      />

      <Section>
        <Container className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <Photo
              src=""
              alt="The Solar Works team reviewing a system design"
              className="aspect-[4/3] w-full rounded-3xl shadow-lg"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </Reveal>
          <div>
            <SectionHeading eyebrow="Our mission" title="Make the shift to clean energy something you never regret" />
            <p className="mt-4 text-muted-foreground text-pretty">
              We started Solar Works because too many homeowners were sold systems that didn&apos;t fit
              their needs and weren&apos;t supported after installation. We do it differently: design
              around your real consumption, install with care, and stay reachable for the long haul.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-4">
              {stats.map((s) => (
                <div key={s.label}>
                  <p className="text-2xl font-semibold tracking-tight">{s.value}</p>
                  <p className="text-sm text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </Section>

      <Section className="bg-muted/30">
        <Container>
          <SectionHeading eyebrow="What we value" title="How we work" align="center" className="mx-auto" />
          <div className="mx-auto mt-12 grid max-w-4xl gap-4 sm:grid-cols-3">
            {values.map((v, i) => (
              <Reveal key={v.title} delay={i * 60}>
                <Card className="h-full">
                  <CardContent className="flex flex-col gap-2">
                    <h3 className="font-semibold">{v.title}</h3>
                    <p className="text-sm text-muted-foreground text-pretty">{v.body}</p>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <SectionHeading eyebrow="The people" title="Who you'll work with" />
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {team.map((member, i) => (
              <Reveal key={member.name} delay={i * 60}>
                <div className="flex flex-col items-center rounded-2xl border bg-card p-6 text-center shadow-sm">
                  <Avatar className="size-16">
                    <AvatarFallback className="text-lg">{initials(member.name)}</AvatarFallback>
                  </Avatar>
                  <p className="mt-4 font-semibold">{member.name}</p>
                  <p className="text-sm text-muted-foreground">{member.role}</p>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal className="mt-12 rounded-2xl border bg-muted/30 p-6">
            <div className="flex items-center gap-2 font-medium">
              <MapPin className="size-4 text-primary" /> Where we work
            </div>
            <p className="mt-2 text-muted-foreground">
              We currently serve {siteConfig.serviceAreas.join(", ")}. Not sure if you&apos;re in range?
              Reach out — we&apos;ll let you know.
            </p>
          </Reveal>
        </Container>
      </Section>

      <CtaBand />
    </>
  )
}
