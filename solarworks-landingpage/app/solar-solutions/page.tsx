import type { Metadata } from "next"
import Link from "next/link"
import { Check, ArrowRight } from "lucide-react"

import { solutions } from "@/lib/content/solutions"
import { siteConfig } from "@/lib/site-config"
import { faqs } from "@/lib/content/site-content"
import { cn } from "@/lib/utils"
import { Container, Section, SectionHeading } from "@/components/section"
import { PageHero } from "@/components/page-hero"
import { Reveal } from "@/components/reveal"
import { Photo } from "@/components/photo"
import { Button } from "@/components/ui/button"
import { FaqAccordion } from "@/components/sections/faq-accordion"
import { CtaBand } from "@/components/sections/cta-band"

export const metadata: Metadata = {
  title: "Solar Solutions",
  description:
    "Grid-tied, hybrid with battery, commercial, and solar carport systems — explained simply, with who each one is for.",
}

export default function SolarSolutionsPage() {
  return (
    <>
      <PageHero
        eyebrow="Solar Solutions"
        title={
          <>
            The right system for{" "}
            <span className="word-soft">how you actually use power</span>
          </>
        }
        description="Four ways we help homes and businesses go solar. Not sure which fits? Start an assessment and we'll guide you."
      />

      <Section>
        <Container className="flex flex-col gap-20">
          {solutions.map((solution, i) => {
            const Icon = solution.icon
            const reversed = i % 2 === 1
            return (
              <div
                key={solution.slug}
                id={solution.slug}
                className="grid scroll-mt-24 items-center gap-10 lg:grid-cols-2"
              >
                <Reveal className={cn(reversed && "lg:order-2")}>
                  <Photo
                    src={solution.image}
                    alt={`${solution.name} installation`}
                    className="aspect-[4/3] w-full rounded-3xl shadow-lg"
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                </Reveal>
                <Reveal delay={80} className={cn(reversed && "lg:order-1")}>
                  <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <Icon className="size-6" />
                  </span>
                  <h2 className="mt-5 text-2xl font-semibold tracking-tight sm:text-3xl">
                    {solution.name}
                  </h2>
                  <p className="mt-1 text-sm font-medium text-primary-strong">{solution.forWho}</p>
                  <p className="mt-3 text-muted-foreground text-pretty">{solution.summary}</p>
                  <ul className="mt-5 grid gap-2">
                    {solution.highlights.map((h) => (
                      <li key={h} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                        {h}
                      </li>
                    ))}
                  </ul>
                  <Button asChild className="mt-7">
                    <Link href={`${siteConfig.primaryCta.href}?solution=${solution.slug}`}>
                      Get an assessment for this
                      <ArrowRight />
                    </Link>
                  </Button>
                </Reveal>
              </div>
            )
          })}
        </Container>
      </Section>

      <Section className="bg-muted/30">
        <Container className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <SectionHeading
            eyebrow="Solution FAQs"
            title="Grid-tied or hybrid?"
            description="The questions we hear most when people are choosing between options."
          />
          <Reveal>
            <FaqAccordion items={faqs.filter((f) => ["Battery", "General", "Cost & Savings"].includes(f.category)).slice(0, 5)} />
          </Reveal>
        </Container>
      </Section>

      <CtaBand />
    </>
  )
}
