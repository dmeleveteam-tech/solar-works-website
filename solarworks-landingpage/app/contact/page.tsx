import type { Metadata } from "next"
import { Phone, MessageCircle, Mail } from "lucide-react"

import { siteConfig } from "@/lib/site-config"
import { Container, Section } from "@/components/section"
import { PageHero } from "@/components/page-hero"
import { Reveal } from "@/components/reveal"
import { NativeInquiryForm } from "@/components/native-inquiry-form"

const solutionSlugToValue: Record<string, string> = {
  "grid-tied": "Grid-Tied",
  "hybrid-with-battery": "Hybrid with Battery",
  "commercial-farm-carport": "Commercial Solar",
  "solar-carport": "Hybrid with Battery",
}

export const metadata: Metadata = {
  title: "Get a Free Solar Assessment",
  description:
    "Tell us about your home or business and a Solar Works adviser will prepare a free, no-obligation solar assessment.",
}

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ solution?: string }>
}) {
  const { solution } = await searchParams
  const defaultSolution = solution ? solutionSlugToValue[solution] : undefined

  return (
    <>
      <PageHero
        eyebrow="Get a free assessment"
        title={
          <>
            Let&apos;s size up <span className="word-soft">your solar</span>
          </>
        }
        description="Share a few details and we'll come back with a personalized assessment grounded in your real consumption — no obligation, no surprise costs."
      />
      <Section>
        <Container className="grid gap-10 lg:grid-cols-[1.4fr_1fr]">
          <Reveal>
            <NativeInquiryForm defaultSolution={defaultSolution} />
          </Reveal>

          <aside className="flex flex-col gap-4">
            <Reveal className="rounded-2xl border bg-card p-6 shadow-sm">
              <h2 className="font-semibold">Prefer to talk?</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Reach us on whatever channel is easiests.//
              </p> 
              <div className="mt-4 flex flex-col gap-2">
                <ContactRow icon={<Phone className="size-4" />} {...siteConfig.contact.phone} />
                <ContactRow icon={<MessageCircle className="size-4" />} {...siteConfig.contact.viber} />
                <ContactRow icon={<MessageCircle className="size-4" />} {...siteConfig.contact.whatsapp} />
                <ContactRow icon={<Mail className="size-4" />} {...siteConfig.contact.email} />
              </div>
            </Reveal>
          </aside>
        </Container>
      </Section>
    </>
  )
}

function ContactRow({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode
  label: string
  value: string
  href: string
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-muted"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-xs text-muted-foreground">{label}</span>
        <span className="block truncate font-medium">{value}</span>
      </span>
    </a>
  )
}

