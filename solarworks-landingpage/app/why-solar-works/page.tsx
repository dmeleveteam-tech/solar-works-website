import type { Metadata } from "next"
import { Check, Play } from "lucide-react"

import { trustMarkers, howItWorks } from "@/lib/content/site-content"
import { Container, Section, SectionHeading } from "@/components/section"
import { PageHero } from "@/components/page-hero"
import { Reveal } from "@/components/reveal"
import { Card, CardContent } from "@/components/ui/card"
import { CtaBand } from "@/components/sections/cta-band"

export const metadata: Metadata = {
  title: "Why Solar Works",
  description:
    "Personalized design, quality components, industry-best warranties, clean installation, and lifetime support — why clients trust Solar Works.",
}

const pillars = [
  {
    title: "Personalized system design",
    body: "We design around your actual consumption and roof — never a one-size-fits-all package. The result is a system that fits your life and your budget.",
  },
  {
    title: "Quality components",
    body: "Tier-1 panels and reputable inverters and batteries. The parts that matter are the parts you don't want to replace in five years.",
  },
  {
    title: "Industry-best warranties",
    body: "20-year panel and 10-year battery warranties, backed by lifetime after-sales support while your products are under warranty.",
  },
  {
    title: "Clean installation",
    body: "Tidy cable management, careful mounting, and respect for your property. Workmanship you can be proud to show visitors.",
  },
]

export default function WhySolarWorksPage() {
  return (
    <>
      <PageHero
        eyebrow="Why Solar Works"
        title={
          <>
            Get your solar right{" "}
            <span className="word-soft">the first time</span>
          </>
        }
        description="Solar is a 20-year decision. These are the things we refuse to cut corners on — because they're what protect your investment."
      />

      <Section>
        <Container className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            {/*
              Link out to the reel on Facebook rather than embedding the FB video
              plugin: browser tracking prevention (Microsoft Edge's is on by
              default) blocks facebook.com plugin frames, so an inline embed fails
              for many visitors. A plain link is never framed and can't be blocked.
            */}
            <a
              href="https://www.facebook.com/reel/2069197367262156/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Watch our customer reel on Facebook (opens in a new tab)"
              className="group relative grid aspect-[1/1] w-full place-items-center overflow-hidden rounded-3xl border bg-gradient-to-br from-primary/10 via-muted to-muted shadow-lg transition-shadow duration-200 hover:shadow-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              <span className="grid size-16 place-items-center rounded-full bg-background/90 text-primary shadow-lg transition-transform duration-200 ease-out motion-safe:group-hover:scale-110 motion-safe:group-active:scale-95">
                <Play className="size-7 translate-x-0.5 fill-current" />
              </span>
              <span className="absolute inset-x-5 bottom-5 text-center">
                <span className="rounded-lg bg-background/85 px-3 py-1.5 text-sm font-medium text-foreground backdrop-blur">
                  Watch our customer reel on Facebook
                </span>
              </span>
            </a>
          </Reveal>
          <div className="grid gap-6">
            {pillars.map((p, i) => (
              <Reveal key={p.title} delay={i * 60} className="flex gap-4">
                <span className="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-primary/15 text-primary">
                  <Check className="size-4" />
                </span>
                <div>
                  <h3 className="font-semibold">{p.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground text-pretty">{p.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      <Section className="bg-muted/30">
        <Container>
          <SectionHeading
            eyebrow="What you can count on"
            title="Lower risk, by design"
            align="center"
            className="mx-auto"
          />
          <div className="mx-auto mt-12 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {trustMarkers.map((marker, i) => {
              const Icon = marker.icon
              return (
                <Reveal key={marker.title} delay={i * 50}>
                  <Card className="h-full">
                    <CardContent className="flex flex-col gap-3">
                      <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="size-5" />
                      </span>
                      <h3 className="font-semibold">{marker.title}</h3>
                      <p className="text-sm text-muted-foreground text-pretty">
                        {marker.description}
                      </p>
                    </CardContent>
                  </Card>
                </Reveal>
              )
            })}
          </div>
        </Container>
      </Section>

      <Section>
        <Container>
          <SectionHeading
            eyebrow="Our process"
            title="From first message to switch-on"
          />
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {howItWorks.map((step, i) => {
              const Icon = step.icon
              return (
                <Reveal key={step.number} delay={i * 60}>
                  <div className="flex items-center gap-3">
                    <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="size-5" />
                    </span>
                    <span className="font-mono text-sm text-muted-foreground">{step.number}</span>
                  </div>
                  <h3 className="mt-4 font-semibold">{step.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
                    {step.description}
                  </p>
                </Reveal>
              )
            })}
          </div>
        </Container>
      </Section>

      <CtaBand />
    </>
  )
}
