import Link from "next/link"
import { ArrowRight, FileText, MessageSquareText } from "lucide-react"

import { siteConfig } from "@/lib/site-config"
import { Container, Section } from "@/components/section"
import { Reveal } from "@/components/reveal"
import { Button } from "@/components/ui/button"
import { PathGraphic } from "@/components/path-graphic"

export function CtaBand({
  title = "Ready to take your power bill off autopilot?",
  description = "Get a free, no-obligation assessment grounded in your real consumption. Fill out a quick form, or chat with our Solar Assistant — whichever's easier.",
}: {
  title?: string
  description?: string
}) {
  return (
    <Section>
      <Container>
        <Reveal className="relative overflow-hidden rounded-[2rem] bg-primary px-6 py-16 text-center text-primary-foreground sm:px-12 sm:py-20">
          <PathGraphic className="pointer-events-none absolute inset-0 h-full w-full text-primary-foreground/10" />
          <div className="relative mx-auto max-w-2xl">
            <h2 className="text-display text-3xl sm:text-4xl lg:text-[2.75rem] lg:leading-[1.05]">
              {title}
            </h2>
            <p className="mt-4 text-lg text-primary-foreground/70 text-pretty">
              {description}
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="bg-background text-foreground hover:bg-background/85"
              >
                <Link href={siteConfig.primaryCta.href}>
                  <FileText />
                  Get my free assessment
                  <ArrowRight />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                data-chat-open="true"
                className="border-foreground/25 bg-transparent text-foreground hover:bg-foreground/5"
              >
                <Link href={`${siteConfig.primaryCta.href}?via=chat`}>
                  <MessageSquareText />
                  Chat with our Solar Assistant
                </Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </Container>
    </Section>
  )
}
