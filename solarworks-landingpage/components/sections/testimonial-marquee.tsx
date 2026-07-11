"use client"

import * as React from "react"
import { Play, Quote, VolumeX } from "lucide-react"

import type { VideoTestimonial } from "@/lib/content/testimonials"
import { cn } from "@/lib/utils"
import { Photo } from "@/components/photo"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog"
import { track, ANALYTICS_EVENTS } from "@/lib/analytics"

/**
 * Richer, human-sounding captions for the testimonials we've confirmed with the
 * client. Anything not in this map falls back to the item's own headline/summary.
 */
const CAPTIONS: Record<string, { title: string; subtitle: string; tag: string }> = {
  "vt-corciga": {
    title: "Going solar was the best decision we made for our family.",
    subtitle:
      "Mr. Ric Corciga on why a system built around their real usage keeps paying off.",
    tag: "Family home",
  },
  "vt-raca": {
    title: "Our electric bill dropped drastically. We only wish we'd done it sooner.",
    subtitle:
      "Ms. Zeny Raca on going from high monthly bills to real, measurable savings.",
    tag: "Homeowner",
  },
  "vt-fb-reel-01": {
    title: "The whole process was simple and stress-free.",
    subtitle:
      "A Solar Works customer on how smoothly the install went, start to finish.",
    tag: "Customer story",
  },
  "vt-fb-reel-02": {
    title: "I didn't expect this much savings. It's been a game changer.",
    subtitle:
      "One customer on how solar beat their expectations from the very first month.",
    tag: "Customer story",
  },
}

function captionFor(item: VideoTestimonial) {
  return (
    CAPTIONS[item.id] ?? {
      title: item.headline,
      subtitle: item.summary,
      tag: item.audience,
    }
  )
}

/** The play-thumbnail + copy that every card shares. */
function CardBody({
  item,
  playing = false,
}: {
  item: VideoTestimonial
  playing?: boolean
}) {
  const caption = captionFor(item)
  // Muted inline preview is only possible for YouTube — Facebook plugin frames
  // are blocked by browser tracking prevention (see testimonials.ts).
  const preview = playing && Boolean(item.videoId)
  return (
    <div className="flex h-full flex-col">
      {/* Thumbnail / play affordance (swaps to a muted preview on hover) */}
      <div className="group/thumb relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-muted">
        <Photo
          src={item.thumbnail}
          alt={`${item.name}, customer story`}
          className="absolute inset-0 size-full object-cover transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] motion-safe:group-hover/thumb:scale-105"
          sizes="(max-width: 768px) 90vw, 360px"
        />
        {preview ? (
          // Autoplays muted; pointer-events-none so a click still reaches the
          // card and opens the full-sound dialog. Unmounting stops playback.
          <iframe
            className="pointer-events-none absolute inset-0 size-full"
            src={`https://www.youtube-nocookie.com/embed/${item.videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${item.videoId}&modestbranding=1&playsinline=1&rel=0&disablekb=1`}
            title={`${item.name}, muted preview`}
            allow="autoplay; encrypted-media; picture-in-picture"
            tabIndex={-1}
            aria-hidden
          />
        ) : null}
        <div
          className={cn(
            "absolute inset-0 transition-colors",
            preview ? "bg-transparent" : "bg-black/10 group-hover/thumb:bg-black/25",
          )}
        />
        <span
          className={cn(
            "absolute inset-0 grid place-items-center transition-opacity duration-200",
            preview && "opacity-0",
          )}
        >
          <span className="grid size-14 place-items-center rounded-full bg-background/90 text-primary shadow-lg transition-transform duration-200 ease-out group-hover/thumb:scale-110 motion-safe:group-active/thumb:scale-95">
            <Play className="size-6 translate-x-0.5 fill-current" aria-hidden />
          </span>
        </span>
        {preview ? (
          <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/65 px-2 py-1 text-[10px] font-medium text-white backdrop-blur-sm">
            <VolumeX className="size-3" aria-hidden />
            Sound off
          </span>
        ) : null}
      </div>

      {/* Copy */}
      <div className="mt-5 flex flex-1 flex-col">
        <span className="inline-flex w-fit items-center rounded-full border border-primary/20 bg-primary/5 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary-strong">
          {caption.tag}
        </span>
        <div className="mt-3 flex gap-2">
          <Quote className="size-4 shrink-0 text-primary/30" aria-hidden />
          <p className="font-heading text-base font-semibold leading-snug text-foreground line-clamp-3">
            {caption.title}
          </p>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground line-clamp-2">
          {caption.subtitle}
        </p>
        <p className="mt-auto border-t pt-3 text-xs font-semibold text-foreground">
          {item.name}
          {item.location ? (
            <span className="ml-1.5 font-normal text-muted-foreground">
              ({item.location})
            </span>
          ) : null}
        </p>
      </div>
    </div>
  )
}

const cardShell =
  "marquee-card group/card flex h-full w-full flex-col rounded-3xl border bg-card p-5 text-left shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"

/**
 * One testimonial card. YouTube stories open in a dialog (privacy-preserving
 * nocookie embed); Facebook reels link out to Facebook (their plugin frame is
 * blocked by browsers' default tracking prevention, so we don't embed it).
 *
 * `duplicate` marks the cloned second half of the loop — it's hidden from
 * assistive tech and removed from the tab order so nothing is announced twice.
 */
function TestimonialCard({
  item,
  duplicate = false,
}: {
  item: VideoTestimonial
  duplicate?: boolean
}) {
  // Spacing lives on each card (mr) rather than a flex `gap` on the track, so
  // the strip is a perfect repeat of [card + margin] units. That makes the
  // translateX(-50%) loop land exactly on the duplicate with no seam jump.
  const width = "mr-6 w-[300px] shrink-0 sm:w-[340px] md:w-[360px]"
  const tabIndex = duplicate ? -1 : undefined

  // Muted autoplay (YouTube only). Each card lazy-mounts its player when it
  // scrolls into view and unmounts when it leaves, so only the handful of cards
  // actually on screen ever load a video — not every copy in the loop at once.
  // Skipped under reduced-motion (a playing video is motion), which keeps the
  // static thumbnails and the manual-scroll fallback.
  const wrapRef = React.useRef<HTMLDivElement>(null)
  const [playing, setPlaying] = React.useState(false)

  React.useEffect(() => {
    if (!item.videoId || typeof window === "undefined") return
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const el = wrapRef.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => setPlaying(entry.isIntersecting),
      { threshold: 0.4 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [item.videoId])

  const inner = (
    <div ref={wrapRef} className={width} aria-hidden={duplicate || undefined}>
      {item.facebookUrl ? (
        <a
          href={item.facebookUrl}
          target="_blank"
          rel="noopener noreferrer"
          tabIndex={tabIndex}
          onClick={() => track(ANALYTICS_EVENTS.testimonialVideoPlay, { name: item.name })}
          className={cardShell}
          aria-label={`Watch ${item.name}'s story on Facebook (opens in a new tab)`}
        >
          <CardBody item={item} playing={playing} />
        </a>
      ) : (
        <Dialog
          onOpenChange={(open) => {
            if (open) track(ANALYTICS_EVENTS.testimonialVideoPlay, { name: item.name })
          }}
        >
          <DialogTrigger asChild>
            <button
              type="button"
              tabIndex={tabIndex}
              className={cardShell}
              aria-label={`Play ${item.name}'s story`}
            >
              <CardBody item={item} playing={playing} />
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
                title={`${item.name}, customer story`}
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
  )

  return inner
}

export function TestimonialMarquee({ items }: { items: VideoTestimonial[] }) {
  if (items.length === 0) return null

  // The loop is two identical halves; animating the track to translateX(-50%)
  // wraps seamlessly. Each half must be at least as wide as the viewport or a
  // gap shows at the seam on large monitors — so with only a handful of unique
  // cards we widen each half by repeating the set before duplicating it.
  const half = [...items, ...items] // ~2× cards → wider than any common monitor
  const loop = [...half, ...half]
  // Only the first pass is real content; everything after is a visual clone.
  const uniqueCount = items.length

  return (
    <div
      className="marquee-viewport relative w-full overflow-hidden py-10 [--marquee-duration:60s] [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)] [-webkit-mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]"
      role="region"
      aria-label="Customer video testimonials"
    >
      <div className="marquee-track flex w-max">
        {loop.map((item, i) => (
          <TestimonialCard
            key={`${item.id}-${i}`}
            item={item}
            duplicate={i >= uniqueCount}
          />
        ))}
      </div>
    </div>
  )
}
