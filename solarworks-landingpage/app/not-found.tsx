import type { Metadata } from "next"
import Link from "next/link"

import { siteConfig, mainNav } from "@/lib/site-config"
import { Container, Section } from "@/components/section"
import { PageHero } from "@/components/page-hero"
import { Button } from "@/components/ui/button"

export const metadata: Metadata = {
  title: "Page not found",
  description:
    "We couldn't find the page you were looking for. Explore Solar Works or get your free solar assessment.",
}

export default function NotFound() {
  return (
    <>
      <PageHero
        eyebrow="404"
        title="We couldn't find that page"
        description="The link may be out of date or the page may have moved. Here are some good places to pick up from."
      >
        <div className="flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/">Back to home</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href={siteConfig.primaryCta.href}>
              {siteConfig.primaryCta.label}
            </Link>
          </Button>
        </div>
      </PageHero>

      <Section>
        <Container className="max-w-3xl">
          <h2 className="text-display text-2xl sm:text-3xl">Explore Solar Works</h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {mainNav.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="group flex flex-col gap-1 rounded-lg border p-4 transition-colors hover:border-primary/60 hover:bg-muted/50"
                >
                  <span className="font-semibold group-hover:text-primary-strong">
                    {link.label}
                  </span>
                  {link.description ? (
                    <span className="text-sm text-muted-foreground">
                      {link.description}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-8 text-sm text-muted-foreground">
            Still stuck? Reach us on{" "}
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
            </a>
            .
          </p>
        </Container>
      </Section>
    </>
  )
}
