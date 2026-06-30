import { cn } from "@/lib/utils"
import { Reveal } from "@/components/reveal"

export function Container({
  className,
  children,
}: {
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn("mx-auto w-full max-w-[96rem] px-4 sm:px-6 lg:px-10", className)}
    >
      {children}
    </div>
  )
}

export function Section({
  className,
  children,
  id,
}: {
  className?: string
  children: React.ReactNode
  id?: string
}) {
  return (
    <section id={id} className={cn("py-20 sm:py-28", className)}>
      {children}
    </section>
  )
}

/** Small uppercase section label with a single amber node dot. */
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="section-label inline-flex items-center gap-2">
      <span className="size-1.5 rounded-full bg-primary" />
      {children}
    </span>
  )
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  className,
}: {
  eyebrow?: string
  title: React.ReactNode
  description?: string
  align?: "left" | "center"
  className?: string
}) {
  return (
    <Reveal
      className={cn(
        "flex flex-col gap-4",
        align === "center" && "items-center text-center",
        className,
      )}
    >
      {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
      <h2 className="text-display text-3xl sm:text-4xl lg:text-[2.75rem] lg:leading-[1.05]">
        {title}
      </h2>
      {description ? (
        <p
          className={cn(
            "text-lg text-muted-foreground text-pretty",
            align === "center" && "max-w-2xl",
          )}
        >
          {description}
        </p>
      ) : null}
    </Reveal>
  )
}
