"use client"

import { useEffect } from "react"
import Link from "next/link"

import { siteConfig } from "@/lib/site-config"
import { Container, Section } from "@/components/section"
import { PageHero } from "@/components/page-hero"
import { Button } from "@/components/ui/button"

// Route-level error boundary. Renders inside the shared layout (header/footer
// stay intact) whenever a segment throws during render. `reset()` retries the
// segment without a full page reload.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Surfaces in the browser console and any wired error reporter.
    console.error(error)
  }, [error])

  return (
    <>
      <PageHero
        eyebrow="Something went wrong"
        title="This page ran into a problem"
        description="Sorry about that — the issue has been logged. You can try again, or head back and pick up where you left off."
      >
        <div className="flex flex-wrap gap-3">
          <Button size="lg" onClick={() => reset()}>
            Try again
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </PageHero>

      <Section>
        <Container className="max-w-3xl">
          <p className="text-muted-foreground">
            If this keeps happening, please reach us on{" "}
            <a
              href={siteConfig.contact.viber.href}
              className="font-medium text-primary-strong underline-offset-4 hover:underline"
            >
              Viber
            </a>{" "}
            or{" "}
            <a
              href={siteConfig.contact.email.href}
              className="font-medium text-primary-strong underline-offset-4 hover:underline"
            >
              email us
            </a>{" "}
            and we&apos;ll help you out.
          </p>
          {error?.digest ? (
            <p className="mt-4 text-xs text-muted-foreground/70">
              Reference code: {error.digest}
            </p>
          ) : null}
        </Container>
      </Section>
    </>
  )
}
