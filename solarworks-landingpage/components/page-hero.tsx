import { Container, Eyebrow } from "@/components/section"
import { Reveal } from "@/components/reveal"
import { PathGraphic } from "@/components/path-graphic"

export function PageHero({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow?: string
  title: React.ReactNode
  description?: string
  children?: React.ReactNode
}) {
  return (
    <section className="relative overflow-hidden border-b bg-grid">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background/40 via-background/85 to-background"
      />
      <PathGraphic className="pointer-events-none absolute -top-10 right-0 h-[22rem] w-[40rem] text-foreground/10" />
      <Container className="relative py-20 sm:py-24">
        <div className="max-w-3xl">
          {eyebrow ? (
            <Reveal>
              <Eyebrow>{eyebrow}</Eyebrow>
            </Reveal>
          ) : null}
          <Reveal delay={60}>
            <h1 className="text-display mt-5 text-4xl sm:text-5xl lg:text-6xl lg:leading-[1.02]">
              {title}
            </h1>
          </Reveal>
          {description ? (
            <Reveal delay={120}>
              <p className="mt-5 text-lg text-muted-foreground text-pretty">
                {description}
              </p>
            </Reveal>
          ) : null}
          {children ? (
            <Reveal delay={180} className="mt-8">
              {children}
            </Reveal>
          ) : null}
        </div>
      </Container>
    </section>
  )
}
