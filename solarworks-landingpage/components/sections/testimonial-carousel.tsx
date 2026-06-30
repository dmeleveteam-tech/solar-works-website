"use client"

import * as React from "react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"
import { ArrowLeft, ArrowRight, Quote, Star } from "lucide-react"

import { cn } from "@/lib/utils"
import type { WrittenTestimonial } from "@/lib/content/testimonials"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

const EASE = [0.23, 1, 0.32, 1] as const

export function TestimonialCarousel({ items }: { items: WrittenTestimonial[] }) {
  const reduce = useReducedMotion()
  const [index, setIndex] = React.useState(0)
  const [dir, setDir] = React.useState(1)
  // Pause auto-advance while the user is hovering/focused inside the carousel.
  const [paused, setPaused] = React.useState(false)
  const active = items[index]

  const go = (next: number) => {
    setDir(next > index || (index === items.length - 1 && next === 0) ? 1 : -1)
    setIndex((next + items.length) % items.length)
  }

  // Auto-advance forward, looping infinitely. Skipped under reduced-motion or
  // while paused. Restarts whenever `index` changes so manual nav resets timing.
  React.useEffect(() => {
    if (reduce || paused || items.length <= 1) return
    const id = window.setInterval(() => {
      setDir(1)
      setIndex((i) => (i + 1) % items.length)
    }, 5000)
    return () => window.clearInterval(id)
  }, [reduce, paused, index, items.length])

  return (
    <div
      className="mx-auto max-w-3xl"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="relative overflow-hidden rounded-3xl bg-card p-8 shadow-sm ring-1 ring-foreground/10 sm:p-12">
        <Quote className="size-9 text-primary/40" aria-hidden />
        <div className="relative mt-5 min-h-40">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.blockquote
              key={active.id}
              custom={dir}
              initial={reduce ? { opacity: 0 } : { opacity: 0, x: dir * 24 }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, x: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, x: dir * -24 }}
              transition={{ duration: 0.4, ease: EASE }}
            >
              <p className="text-balance font-heading text-xl leading-relaxed font-medium sm:text-2xl">
                “{active.quote}”
              </p>
              <footer className="mt-6 flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>{initials(active.name)}</AvatarFallback>
                </Avatar>
                <div className="text-sm">
                  <p className="font-semibold">{active.name}</p>
                  <p className="text-muted-foreground">
                    {[active.location, active.systemType].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <span className="ml-auto flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="size-4 fill-primary text-primary" />
                  ))}
                </span>
              </footer>
            </motion.blockquote>
          </AnimatePresence>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        {/* Client selector row */}
        <div className="flex flex-wrap gap-1.5">
          {items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onClick={() => go(i)}
              aria-label={`Show testimonial from ${item.name}`}
              aria-current={i === index ? "true" : undefined}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                i === index
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {item.name}
            </button>
          ))}
        </div>

        <div className="flex shrink-0 gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => go(index - 1)}
            aria-label="Previous testimonial"
          >
            <ArrowLeft />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => go(index + 1)}
            aria-label="Next testimonial"
          >
            <ArrowRight />
          </Button>
        </div>
      </div>
    </div>
  )
}
