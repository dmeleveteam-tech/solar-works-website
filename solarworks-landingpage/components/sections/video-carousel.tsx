"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight, Play, Quote } from "lucide-react"

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

export function VideoCarousel({ videoTestimonials }: { videoTestimonials: VideoTestimonial[] }) {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = React.useState(false)
  const [showRightArrow, setShowRightArrow] = React.useState(true)

  const checkScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current
      setShowLeftArrow(scrollLeft > 5)
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 5)
    }
  }

  React.useEffect(() => {
    const el = scrollContainerRef.current
    if (el) {
      el.addEventListener("scroll", checkScroll)
      // Check initially and on resize
      checkScroll()
      window.addEventListener("resize", checkScroll)
    }
    return () => {
      if (el) {
        el.removeEventListener("scroll", checkScroll)
      }
      window.removeEventListener("resize", checkScroll)
    }
  }, [videoTestimonials])

  const scroll = (direction: "left" | "right") => {
    if (scrollContainerRef.current) {
      const { clientWidth } = scrollContainerRef.current
      const scrollAmount = clientWidth * 0.75
      scrollContainerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      })
    }
  }

  if (videoTestimonials.length === 0) return null

  return (
    <div className="group/carousel relative w-full">
      {/* ── Optional Navigation Controls (Top Right) ── */}
      <div className="absolute -top-16 right-0 hidden items-center gap-2 sm:flex">
        <button
          type="button"
          onClick={() => scroll("left")}
          disabled={!showLeftArrow}
          aria-label="Scroll left"
          className={cn(
            "grid size-10 place-items-center rounded-full border bg-background text-foreground shadow-sm transition-all hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-0 disabled:pointer-events-none",
          )}
        >
          <ChevronLeft className="size-5" />
        </button>
        <button
          type="button"
          onClick={() => scroll("right")}
          disabled={!showRightArrow}
          aria-label="Scroll right"
          className={cn(
            "grid size-10 place-items-center rounded-full border bg-background text-foreground shadow-sm transition-all hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-0 disabled:pointer-events-none",
          )}
        >
          <ChevronRight className="size-5" />
        </button>
      </div>

      {/* ── Scrollable Container ── */}
      <div
        ref={scrollContainerRef}
        className="flex w-full gap-6 overflow-x-auto pb-6 scroll-smooth snap-x snap-mandatory scrollbar-none px-4 -mx-4 sm:px-0 sm:mx-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        {videoTestimonials.map((item) => {
          const caption = CAPTIONS[item.id] ?? {
            title: `"${item.headline}"`,
            subtitle: item.summary,
            tag: item.audience,
          }

          return (
            <div
              key={item.id}
              className="flex w-[290px] shrink-0 snap-start flex-col rounded-3xl border bg-card p-5 shadow-md transition-all duration-300 hover:shadow-lg sm:w-[350px] md:w-[380px]"
            >
              {/* Video Thumbnail / Player */}
              <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-muted">
                {item.facebookEmbedUrl ? (
                  <iframe
                    className="absolute inset-0 size-full border-none"
                    src={item.facebookEmbedUrl}
                    title={`${item.name} — customer story`}
                    scrolling="no"
                    allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                    allowFullScreen
                  />
                ) : (
                  <Dialog
                    onOpenChange={(open) => {
                      if (open) track(ANALYTICS_EVENTS.testimonialVideoPlay, { name: item.name })
                    }}
                  >
                    <DialogTrigger asChild>
                      <button
                        type="button"
                        className="group/thumb relative block size-full text-left focus-visible:outline-none"
                        aria-label={`Play ${item.name}'s story`}
                      >
                        <Photo
                          src={item.thumbnail}
                          alt={`${item.name} — customer story thumbnail`}
                          className="absolute inset-0 size-full object-cover transition-transform duration-500 ease-out group-hover/thumb:scale-105"
                          sizes="(max-width: 768px) 100vw, 33vw"
                        />
                        <div className="absolute inset-0 bg-black/10 transition-opacity group-hover/thumb:bg-black/25" />
                        <span className="absolute inset-0 grid place-items-center">
                          <span className="grid size-14 place-items-center rounded-full bg-background/90 text-primary shadow-lg transition-transform duration-200 ease-out group-hover/thumb:scale-110">
                            <Play className="size-6 translate-x-0.5 fill-current" />
                          </span>
                        </span>
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
              </div>

              {/* Card Body */}
              <div className="mt-5 flex flex-1 flex-col justify-between">
                <div>
                  {/* Tag */}
                  <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary-strong">
                    {caption.tag}
                  </span>

                  {/* Title / Quote */}
                  <div className="mt-3 flex gap-2">
                    <Quote className="size-4 shrink-0 text-primary/30" aria-hidden />
                    <h4 className="font-heading text-base font-semibold leading-snug text-foreground line-clamp-3">
                      {caption.title}
                    </h4>
                  </div>

                  {/* Subtitle / Details */}
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground line-clamp-3">
                    {caption.subtitle}
                  </p>
                </div>

                {/* Footer Info */}
                <div className="mt-4 border-t pt-3">
                  <p className="text-xs font-semibold text-foreground">
                    — {item.name}
                    {item.location ? (
                      <span className="ml-1.5 font-normal text-muted-foreground">({item.location})</span>
                    ) : null}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}