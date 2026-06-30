import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, BookOpen } from "lucide-react"

import { getFaqs } from "@/lib/content/api"
import { Container, Section, SectionHeading } from "@/components/section"
import { PageHero } from "@/components/page-hero"
import { Reveal } from "@/components/reveal"
import { Photo } from "@/components/photo"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { FaqAccordion } from "@/components/sections/faq-accordion"
import { CtaBand } from "@/components/sections/cta-band"

export const metadata: Metadata = {
  title: "Solar Learning Center & FAQs",
  description:
    "Guides, explainers, and frequently asked questions to help you understand solar before you buy.",
}

const articles = [
  {
    title: "Grid-tied vs. hybrid: which is right for you?",
    excerpt: "A plain-language breakdown of the two most common home setups and when a battery is worth it.",
    tag: "Buying guide",
    minutes: 6,
    image: "https://images.unsplash.com/photo-1466611653911-95081537e5b7?auto=format&fit=crop&w=1000&q=80",
  },
  {
    title: "How to read your electricity bill",
    excerpt: "Find your kWh, understand peak usage, and learn what actually drives your monthly cost.",
    tag: "Solar basics",
    minutes: 4,
    image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1000&q=80",
  },
  {
    title: "5 solar myths, debunked",
    excerpt: "Does solar work when it's cloudy? Will it power your home at night? We clear up the common ones.",
    tag: "Myth-busting",
    minutes: 5,
    image: "https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=1000&q=80",
  },
  {
    title: "What net metering means for your savings",
    excerpt: "How exporting surplus energy back to the grid works in the Philippines, and what to expect.",
    tag: "Savings",
    minutes: 7,
    image: "https://images.unsplash.com/photo-1605980776566-0486c3ac7617?auto=format&fit=crop&w=1000&q=80",
  },
]

export default async function LearningCenterPage() {
  const faqs = await getFaqs()
  return (
    <>
      <PageHero
        eyebrow="Learning center"
        title={
          <>
            Understand solar <span className="word-soft">before you buy</span>
          </>
        }
        description="No pressure, no jargon. Just clear guides and honest answers to help you make a confident decision."
      />

      <Section>
        <Container>
          <SectionHeading eyebrow="Guides & explainers" title="Start here" />
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {articles.map((article, i) => (
              <Reveal key={article.title} delay={i * 60}>
                <Card className="group/card h-full gap-0 pt-0">
                  <Photo
                    src={article.image}
                    alt=""
                    className="aspect-[16/10] w-full"
                    imgClassName="transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] motion-safe:group-hover/card:scale-[1.04]"
                    sizes="(max-width: 768px) 100vw, 25vw"
                  />
                  <CardContent className="flex flex-col gap-3 pt-5">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{article.tag}</Badge>
                      <span className="text-xs text-muted-foreground">{article.minutes} min read</span>
                    </div>
                    <h3 className="font-semibold text-balance">{article.title}</h3>
                    <p className="text-sm text-muted-foreground text-pretty">{article.excerpt}</p>
                    <span className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-primary-strong">
                      Read article
                      <ArrowRight className="size-4 transition-transform duration-200 ease-out group-hover/card:translate-x-0.5" />
                    </span>
                  </CardContent>
                </Card>
              </Reveal>
            ))}
          </div>
        </Container>
      </Section>

      <Section className="bg-muted/30">
        <Container className="grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <SectionHeading
              eyebrow="FAQs"
              title="Frequently asked questions"
              description="The questions buyers ask us most often."
            />
            <Reveal className="mt-6 hidden lg:flex">
              <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <BookOpen className="size-4 text-primary" />
                Still curious? <Link href="/contact" className="font-medium text-primary-strong hover:underline">Ask us directly</Link>
              </span>
            </Reveal>
          </div>
          <Reveal>
            <FaqAccordion items={faqs} />
          </Reveal>
        </Container>
      </Section>

      <CtaBand />
    </>
  )
}
