import Link from "next/link"
import {
  ArrowRight,
  Check,
  Star,
  Sun,
  ShieldCheck,
  BatteryFull,
  HeartHandshake,
  PencilRuler,
  LineChart,
  MessageSquareText,
  Plug,
  Gauge,
  Sparkles,
} from "lucide-react"

import { siteConfig } from "@/lib/site-config"
import { solutions } from "@/lib/content/solutions"
import { trustMarkers, stats } from "@/lib/content/site-content"
import { cn } from "@/lib/utils"
import { getTestimonials } from "@/lib/content/api"

import { Container, Section, SectionHeading, Eyebrow } from "@/components/section"
import { Reveal } from "@/components/reveal"
import { Photo } from "@/components/photo"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { HeroVisual } from "@/components/sections/hero-visual"
import { Packages } from "@/components/sections/packages"
import { CtaBand } from "@/components/sections/cta-band"
import { VideoCarousel } from "@/components/sections/video-carousel"

export default async function HomePage() {
  const { video } = await getTestimonials()

  return (
    <>
      <Hero />
      <VideoTestimonialsSection videoTestimonials={video} />
      <LogoCloud />
      <FeatureCards />
      <CapabilityGrid />
      <Showcase />
      <WhatYouGet />
      <PackagesSection />
      <CtaBand />
    </>
  )
}

/* ── 1. Hero ─────────────────────────────────────────────── */
const heroBenefits = [
  "Designed around your real consumption",
  "Tier-1 panels, 20-year warranty",
  "Clean install + lifetime support",
]

function Hero() {
  return (
    <section className="relative overflow-hidden bg-grid">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/30 via-background/80 to-background"
      />
      <Container className="relative grid items-center gap-14 py-16 sm:py-20 lg:grid-cols-2 lg:py-24">
        <div className="flex flex-col items-start gap-6">
          <Reveal>
            <Eyebrow>Solar, done properly</Eyebrow>
          </Reveal>
          <Reveal delay={60}>
            <h1 className="text-display text-4xl sm:text-5xl lg:text-6xl lg:leading-[1.02]">
              Cut your power bill by up to 70%.{" "}
              <span className="word-soft">Own your energy.</span>
            </h1>

          </Reveal>
          <Reveal delay={120}>
            <p className="max-w-xl text-lg text-muted-foreground text-pretty">
              Solar Works designs, installs, and supports a system sized to how
              you actually use power — so you stop renting electricity and start
              owning it. Free assessment, no obligation.
            </p>
          </Reveal>
          <Reveal delay={180} className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href={siteConfig.primaryCta.href}>
                {siteConfig.primaryCta.label}
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href={siteConfig.secondaryCta.href}>
                {siteConfig.secondaryCta.label}
              </Link>
            </Button>
          </Reveal>
          <Reveal
            delay={240}
            className="flex flex-col gap-2.5 pt-2"
            as="ul"
          >
            {heroBenefits.map((b) => (
              <li key={b} className="flex items-center gap-2.5 text-sm">
                <span className="grid size-5 place-items-center rounded-full bg-primary/15 text-primary">
                  <Check className="size-3.5" />
                </span>
                {b}
              </li>
            ))}
          </Reveal>
          <Reveal
            delay={300}
            className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground"
          >
            <span className="inline-flex items-center gap-1.5">
              <span className="flex">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="size-4 fill-primary text-primary" />
                ))}
              </span>
              4.9 average rating
            </span>
            <span className="h-4 w-px bg-border" />
            <span>350+ systems installed</span>
          </Reveal>
        </div>

        <Reveal delay={120}>
          <HeroVisual />
        </Reveal>
      </Container>

      {/* Proof strip */}
      <div className="relative border-y bg-muted/40">
        <Container>
          <div className="grid grid-cols-2 gap-6 py-6 sm:grid-cols-4">
            {stats.map((s, i) => (
              <Reveal key={s.label} delay={i * 60} className="text-center sm:text-left">
                <p className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
                  {s.value}
                </p>
                <p className="text-sm text-muted-foreground">{s.label}</p>
              </Reveal>
            ))}
          </div>
        </Container>
      </div>
    </section>
  )
}

/* ── 2. Video testimonials carousel ─────────────────────── */
import type { VideoTestimonial } from "@/lib/content/testimonials"

function VideoTestimonialsSection({ videoTestimonials }: { videoTestimonials: VideoTestimonial[] }) {
  return (
    <Section id="testimonials" className="bg-muted/30">
      <Container>
        <SectionHeading
          eyebrow="What our customers say"
          title={
            <>
              Real stories,{" "}
              <span className="word-soft">in their own words</span>
            </>
          }
          description="Every testimonial here is from a real Solar Works customer. Hear directly from families and homeowners who made the switch."
          align="center"
          className="mx-auto mb-14"
        />
        <VideoCarousel videoTestimonials={videoTestimonials} />
      </Container>
    </Section>
  )
}

/* ── 3. Logo cloud ───────────────────────────────────────── */
const partnerBrands = ["Canadian Solar", "Jinko", "Huawei", "Deye", "LONGi", "Growatt"]

function LogoCloud() {
  return (
    <Section className="py-14 sm:py-16">
      <Container>
        <Reveal className="text-center">
          <p className="section-label">Built with Tier-1 components</p>
        </Reveal>
        <Reveal
          delay={80}
          className="mt-8 flex flex-wrap items-center justify-center gap-x-10 gap-y-5 sm:gap-x-14"
        >
          {partnerBrands.map((brand) => (
            <span
              key={brand}
              className="font-heading text-lg font-semibold tracking-tight text-muted-foreground/60 grayscale transition-colors hover:text-foreground sm:text-xl"
            >
              {brand}
            </span>
          ))}
        </Reveal>
      </Container>
    </Section>
  )
}

/* ── 3. Three feature cards (with mini mockups) ──────────── */
const features = [
  {
    icon: PencilRuler,
    title: "Personalized design",
    body: "Every system is sized to your actual bill and roof — never an off-the-shelf package.",
    mock: <ProposalMock />,
  },
  {
    icon: ShieldCheck,
    title: "Quality components",
    body: "Tier-1 panels and reputable inverters and batteries, backed by industry-best warranties.",
    mock: <WarrantyMock />,
  },
  {
    icon: HeartHandshake,
    title: "Lifetime support",
    body: "We stay reachable for the life of your warranty — not just until the invoice clears.",
    mock: <SupportMock />,
  },
]

function FeatureCards() {
  return (
    <Section className="bg-muted/30">
      <Container>
        <SectionHeading
          eyebrow="Why Solar Works"
          title="Solar you won't have to think about"
          description="The decisions that protect a 20-year investment — designed in from day one."
          align="center"
          className="mx-auto"
        />
        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {features.map((f, i) => {
            const Icon = f.icon
            return (
              <Reveal key={f.title} delay={i * 70}>
                <Card className="h-full">
                  <CardContent className="flex h-full flex-col gap-5">
                    <div className="rounded-2xl bg-muted/60 p-4 ring-1 ring-foreground/[0.06]">
                      {f.mock}
                    </div>
                    <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="size-5" />
                    </span>
                    <div>
                      <h3 className="font-heading text-lg font-semibold">{f.title}</h3>
                      <p className="mt-1.5 text-sm text-muted-foreground text-pretty">
                        {f.body}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Reveal>
            )
          })}
        </div>
      </Container>
    </Section>
  )
}

/* Mini UI mockups for the feature cards */
function ProposalMock() {
  return (
    <div className="flex h-24 items-end gap-1.5">
      {[40, 64, 52, 78, 88].map((h, i) => (
        <div key={i} className="flex flex-1 items-end self-stretch">
          <div
            className="w-full rounded-t-sm bg-gradient-to-t from-primary/30 to-primary"
            style={{ height: `${h}%` }}
          />
        </div>
      ))}
    </div>
  )
}

function WarrantyMock() {
  return (
    <div className="flex h-24 flex-col justify-center gap-2">
      {[
        { l: "Panels", v: "20 yr" },
        { l: "Battery", v: "10 yr" },
        { l: "Support", v: "Lifetime" },
      ].map((r) => (
        <div
          key={r.l}
          className="flex items-center justify-between rounded-lg bg-background px-3 py-1.5 text-xs ring-1 ring-foreground/[0.06]"
        >
          <span className="text-muted-foreground">{r.l}</span>
          <span className="font-semibold">{r.v}</span>
        </div>
      ))}
    </div>
  )
}

function SupportMock() {
  return (
    <div className="flex h-24 flex-col justify-center gap-2">
      <div className="ml-auto max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-xs text-primary-foreground">
        Is my system producing today?
      </div>
      <div className="max-w-[85%] rounded-2xl rounded-bl-sm bg-background px-3 py-2 text-xs ring-1 ring-foreground/[0.06]">
        Yes — 18.4 kWh so far, right on target ☀
      </div>
    </div>
  )
}

/* ── 4. Capability grid ──────────────────────────────────── */
const capabilities = [
  { icon: LineChart, title: "Consumption modeling", body: "We size around your real load, not a guess." },
  { icon: MessageSquareText, title: "Solar Assistant", body: "Ask questions any time and hand off to a human." },
  { icon: Plug, title: "Net-metering handled", body: "We file the application and documentation for you." },
  { icon: Gauge, title: "Live monitoring", body: "See production and savings from your phone." },
  { icon: Sparkles, title: "Clean workmanship", body: "Tidy cabling and respect for your property." },
  { icon: Sun, title: "Performance reporting", body: "Know your system is delivering, season to season." },
]

function CapabilityGrid() {
  return (
    <Section>
      <Container>
        <SectionHeading
          eyebrow="Built on solid engineering"
          title="Everything working quietly behind the panels"
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {capabilities.map((c, i) => {
            const Icon = c.icon
            return (
              <Reveal key={c.title} delay={i * 50}>
                <div className="flex h-full flex-col gap-3 rounded-2xl border bg-card p-6 transition-shadow hover:shadow-md">
                  <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </span>
                  <h3 className="font-heading font-semibold">{c.title}</h3>
                  <p className="text-sm text-muted-foreground text-pretty">{c.body}</p>
                </div>
              </Reveal>
            )
          })}
        </div>
      </Container>
    </Section>
  )
}

/* ── 5. Alternating showcase ─────────────────────────────── */
function Showcase() {
  return (
    <Section className="bg-muted/30">
      <Container>
        <SectionHeading
          eyebrow="Designed around your roof & budget"
          title="A system that fits how you actually live"
          align="center"
          className="mx-auto"
        />
        <div className="mt-16 flex flex-col gap-16 sm:gap-24">
          {solutions.slice(0, 3).map((solution, i) => {
            const Icon = solution.icon
            const reversed = i % 2 === 1
            return (
              <div
                key={solution.slug}
                className="grid items-center gap-10 lg:grid-cols-2"
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
                  <h3 className="text-display mt-5 text-2xl sm:text-3xl">
                    {solution.name}
                  </h3>
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
                  <Button asChild variant="outline" className="mt-7">
                    <Link href={`${siteConfig.primaryCta.href}?solution=${solution.slug}`}>
                      Get an assessment
                      <ArrowRight />
                    </Link>
                  </Button>
                </Reveal>
              </div>
            )
          })}
        </div>
      </Container>
    </Section>
  )
}

/* ── 6. What you get (2×3 grid) ──────────────────────────── */
function WhatYouGet() {
  return (
    <Section className="bg-muted/30">
      <Container>
        <SectionHeading
          eyebrow="What you get with Solar Works"
          title="Protection, performance, and peace of mind"
          align="center"
          className="mx-auto"
        />
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trustMarkers.map((marker, i) => {
            const Icon = marker.icon
            return (
              <Reveal key={marker.title} delay={i * 50}>
                <Card className="h-full">
                  <CardContent className="flex h-full flex-col gap-3">
                    <span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="size-5" />
                    </span>
                    <h3 className="font-heading font-semibold">{marker.title}</h3>
                    <p className="text-sm text-muted-foreground text-pretty">
                      {marker.description}
                    </p>
                  </CardContent>
                </Card>
              </Reveal>
            )
          })}
          <Reveal delay={trustMarkers.length * 50}>
            <Card className="h-full bg-primary text-primary-foreground">
              <CardContent className="flex h-full flex-col justify-between gap-4">
                <BatteryFull className="size-7" />
                <div>
                  <p className="font-heading font-semibold">See what we&apos;d recommend</p>
                  <p className="mt-1 text-sm text-primary-foreground/70">
                    A free assessment, grounded in your real consumption.
                  </p>
                </div>
                <Button asChild size="sm" className="self-start bg-background text-foreground hover:bg-background/85">
                  <Link href={siteConfig.primaryCta.href}>
                    Get started
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </Reveal>
        </div>
      </Container>
    </Section>
  )
}

/* ── 8. Packages ─────────────────────────────────────────── */
function PackagesSection() {
  return (
    <Section>
      <Container>
        <SectionHeading
          eyebrow="Ways to go solar"
          title="Smarter plans for how you use power"
          description="No fixed price tags — solar is sized to your bill. Pick the shape that fits, and we'll quote it precisely."
          align="center"
          className="mx-auto"
        />
        <div className="mt-12">
          <Packages />
        </div>
      </Container>
    </Section>
  )
}
