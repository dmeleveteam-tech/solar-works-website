"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight, Play, Quote } from "lucide-react"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"

import type { VideoTestimonial } from "@/lib/content/testimonials"
import { Photo } from "@/components/photo"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog"
import { track, ANALYTICS_EVENTS } from "@/lib/analytics"

const CAPTIONS: Record<string, { title: string; subtitle: string; tag: string }> = {
  "vt-corciga": {
    title: '"Going solar was the best decision we made for our family"',
    subtitle:
      "Mr. Ric Corciga shares how Solar Works designed a system that fits their lifestyle — and how they haven't looked back since.",
    tag: "Family Home",
  },
  "vt-raca": {
    title: '"Our electric bill dropped drastically — we wish we did it sooner"',
    subtitle:
      "Ms. Zeny Raca walks us through her journey from high monthly bills to real, measurable savings every single month.",
    tag: "Homeowner",
  },
  "vt-fb-reel-01": {
    title: '"Solar Works made the whole process simple and stress-free"',
    subtitle:
      "A satisfied Solar Works customer describes how smoothly the installation went and the difference it's made day-to-day.",
    tag: "Customer Story",
  },
  "vt-fb-reel-02": {
    title: '"I didn\'t expect this much savings — it\'s been a game changer"',
    subtitle:
      "Hear firsthand how switching to solar exceeded expectations and delivered real financial relief from the very first month.",
    tag: "Customer Story",
  },
}

const EASE = [0.23, 1, 0.32, 1] as const

export function VideoCarousel({ videoTestimonials }: { videoTestimonials: VideoTestimonial[] }) {
  const [current, setCurrent] = React.useState(0)
  const [direction, setDirection] = React.useState<1 | -1>(1)
  const reduce = useReducedMotion()
  const total = videoTestimonials.length
  
  if (total === 0) return null

  const item = videoTestimonials[current]
  const caption = CAPTIONS[item.id] ?? {
    title: `"${item.headline}"`,
    subtitle: item.summary,
    tag: item.audience,
  }

  function go(next: number, dir: 1 | -1) {
    setDirection(dir)
    setCurrent(((next % total) + total) % total)
  }
  function prev() {
    go(current - 1, -1)
  }
  function next() {
    go(current + 1, 1)
  }

  // Keyboard navigation
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") prev()
      if (e.key === "ArrowRight") next()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current, total])

  const variants = {
    enter: (dir: number) => ({ opacity: 0, x: dir * (reduce ? 0 : 56) }),
    center: { opacity: 1, x: 0 },
    exit: (dir: number) => ({ opacity: 0, x: dir * (reduce ? 0 : -56) }),
  }

  return (
    <div className="relative w-full overflow-hidden">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        {/* ── Left: caption side ── */}
        <div className="flex flex-col gap-6 lg:pr-6">
          {/* Tag + counter */}
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={`tag-${current}`}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: reduce ? 0.15 : 0.45, ease: EASE }}
              className="flex items-center gap-3"
            >
              <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-primary-strong">
                {caption.tag}
              </span>
              <span className="text-xs text-muted-foreground">
                {current + 1} / {total}
              </span>
            </motion.div>
          </AnimatePresence>

          {/* Decorative quote mark */}
          <Quote className="size-8 text-primary/25" aria-hidden />

          {/* Title */}
          <AnimatePresence mode="wait" custom={direction}>
            <motion.h3
              key={`title-${current}`}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: reduce ? 0.15 : 0.5, ease: EASE, delay: 0.04 }}
              className="font-heading text-2xl font-semibold leading-snug tracking-tight text-balance sm:text-3xl"
            >
              {caption.title}
            </motion.h3>
          </AnimatePresence>

          {/* Subtitle */}
          <AnimatePresence mode="wait" custom={direction}>
            <motion.p
              key={`sub-${current}`}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: reduce ? 0.15 : 0.5, ease: EASE, delay: 0.08 }}
              className="text-base leading-relaxed text-muted-foreground text-pretty"
            >
              {caption.subtitle}
            </motion.p>
          </AnimatePresence>

          {/* Name */}
          <AnimatePresence mode="wait" custom={direction}>
            <motion.p
              key={`name-${current}`}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: reduce ? 0.15 : 0.5, ease: EASE, delay: 0.12 }}
              className="text-sm font-semibold text-foreground"
            >
              — {item.name}
              {item.location ? (
                <span className="ml-2 font-normal text-muted-foreground">{item.location}</span>
              ) : null}
            </motion.p>
          </AnimatePresence>

          {/* Dot nav + arrow buttons */}
          <div className="flex items-center gap-4 pt-2">
            <button
              type="button"
              onClick={prev}
              aria-label="Previous story"
              className="grid size-10 place-items-center rounded-full border bg-card text-foreground shadow-sm transition-all hover:border-primary/40 hover:text-primary hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next story"
              className="grid size-10 place-items-center rounded-full border bg-card text-foreground shadow-sm transition-all hover:border-primary/40 hover:text-primary hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <ChevronRight className="size-4" />
            </button>

            <div className="flex items-center gap-1.5" role="tablist" aria-label="Story navigation">
              {videoTestimonials.map((_, i) => (
                <button
                  key={i}
                  role="tab"
                  aria-selected={i === current}
                  aria-label={`Go to story ${i + 1}`}
                  onClick={() => go(i, i > current ? 1 : -1)}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300",
                    i === current
                      ? "w-6 bg-primary"
                      : "w-1.5 bg-foreground/20 hover:bg-foreground/40",
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── Right: video side ── */}
        <div className="relative">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={`video-${current}`}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: reduce ? 0.15 : 0.5, ease: EASE }}
              className="relative"
            >
              {item.facebookEmbedUrl ? (
                <div className="relative overflow-hidden rounded-3xl border bg-card shadow-xl ring-1 ring-foreground/[0.06]">
                  <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                    <iframe
                      className="absolute inset-0 size-full"
                      src={item.facebookEmbedUrl}
                      title={`${item.name} — customer story`}
                      style={{ border: "none", overflow: "hidden" }}
                      scrolling="no"
                      allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                      allowFullScreen
                    />
                  </div>
                </div>
              ) : (
                <Dialog
                  onOpenChange={(open) => {
                    if (open) track(ANALYTICS_EVENTS.testimonialVideoPlay, { name: item.name })
                  }}
                >
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="group/thumb relative block w-full overflow-hidden rounded-3xl border bg-card text-left shadow-xl ring-1 ring-foreground/[0.06] focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                      aria-label={`Play ${item.name}'s story`}
                    >
                      <div className="relative aspect-[4/3] overflow-hidden">
                        <Photo
                          src={item.thumbnail}
                          alt={`${item.name} — customer story thumbnail`}
                          className="absolute inset-0 size-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] motion-safe:group-hover/thumb:scale-[1.04]"
                          sizes="(max-width: 1024px) 100vw, 50vw"
                        />
                        <div className="absolute inset-0 bg-black/20 transition-opacity duration-300 group-hover/thumb:bg-black/30" />
                        <span className="absolute inset-0 grid place-items-center">
                          <span className="grid size-20 place-items-center rounded-full bg-background/90 text-primary shadow-2xl ring-4 ring-white/20 transition-all duration-300 ease-out motion-safe:group-hover/thumb:scale-110 motion-safe:group-active/thumb:scale-95">
                            <Play className="size-8 translate-x-0.5 fill-current" />
                          </span>
                        </span>
                      </div>
                    </button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{item.name}</DialogTitle>
                      <DialogDescription>
                        {[item.location, item.systemType ? `${item.systemType} system` : null]
                          .filter(Boolean)
                          .join(" · ") || item.headline}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="relative aspect-video overflow-hidden rounded-xl bg-muted">
                      <iframe
                        className="absolute inset-0 size-full"
                        src={`https://www.youtube-nocookie.com/embed/${item.videoId}?autoplay=1`}
                        title={`${item.name} — customer story`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                      />
                    </div>
                    <p className="text-pretty text-muted-foreground">{item.summary}</p>
                  </DialogContent>
                </Dialog>
              )}

              {/* Ambient glow behind card */}
              <div
                aria-hidden
                className="pointer-events-none absolute -inset-4 -z-10 rounded-[2.5rem] bg-primary/8 blur-2xl"
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}