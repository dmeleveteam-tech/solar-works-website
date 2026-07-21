"use client"

import { Play } from "lucide-react"

import type { VideoTestimonial } from "@/lib/content/testimonials"
import { track, ANALYTICS_EVENTS } from "@/lib/analytics"
import { Photo } from "@/components/photo"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog"

/** The shared card face: thumbnail, play affordance, name/location, and copy. */
function CardFace({ item }: { item: VideoTestimonial }) {
  return (
    <>
      <div className="relative aspect-[4/3] overflow-hidden">
        <Photo
          src={item.thumbnail}
          alt={`${item.name} — ${item.systemType ? `${item.systemType} ` : ""}solar story`}
          className="absolute inset-0 size-full transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] motion-safe:group-hover/card:scale-[1.04]"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
        {item.systemType ? (
          <span className="absolute top-3 left-3">
            <Badge variant="secondary" className="bg-background/85 backdrop-blur">
              {item.systemType}
            </Badge>
          </span>
        ) : null}
        <span className="absolute inset-0 grid place-items-center">
          <span className="grid size-14 place-items-center rounded-full bg-background/90 text-primary shadow-lg transition-transform duration-200 ease-out motion-safe:group-hover/card:scale-110 motion-safe:group-active/card:scale-95">
            <Play className="size-6 translate-x-0.5 fill-current" />
          </span>
        </span>
        <div className="absolute bottom-3 left-3 rounded-lg bg-background/85 px-2.5 py-1.5 text-foreground backdrop-blur">
          <p className="text-sm font-semibold">{item.name}</p>
          {item.location ? (
            <p className="text-xs text-muted-foreground">{item.location}</p>
          ) : null}
        </div>
      </div>
      <div className="p-4">
        <p className="font-medium text-balance">{item.headline}</p>
        <p className="mt-1.5 text-sm text-muted-foreground">{item.summary}</p>
      </div>
    </>
  )
}

const cardClass =
  "group/card relative block w-full overflow-hidden rounded-2xl border bg-card text-left shadow-sm transition-shadow duration-200 hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"

export function VideoTestimonialCard({ item }: { item: VideoTestimonial }) {
  // Facebook reels: link out to the reel on Facebook (opens in a new tab) rather
  // than embedding the FB video plugin. Browser tracking prevention — Microsoft
  // Edge's is on by default — blocks facebook.com plugin frames and shows a
  // "This page has been blocked by Microsoft Edge" interstitial in their place,
  // so an inline embed would fail for many visitors.
  if (item.facebookUrl) {
    return (
      <a
        href={item.facebookUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={() =>
          track(ANALYTICS_EVENTS.testimonialVideoPlay, { name: item.name })
        }
        className={cardClass}
        aria-label={`Watch ${item.name}'s story on Facebook (opens in a new tab)`}
      >
        <CardFace item={item} />
      </a>
    )
  }

  // YouTube: play in a dialog using the privacy-preserving nocookie embed.
  return (
    <Dialog
      onOpenChange={(open) => {
        if (open) track(ANALYTICS_EVENTS.testimonialVideoPlay, { name: item.name })
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className={cardClass}
          aria-label={`Play ${item.name}'s story`}
        >
          <CardFace item={item} />
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
          {item.videoUrl ? (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video
              className="absolute inset-0 size-full bg-black object-contain"
              src={item.videoUrl}
              poster={item.thumbnail}
              controls
              autoPlay
              playsInline
            />
          ) : (
            <iframe
              className="absolute inset-0 size-full"
              src={`https://www.youtube-nocookie.com/embed/${item.videoId}`}
              title={`${item.name} — customer story`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          )}
        </div>
        <p className="text-pretty text-muted-foreground">{item.summary}</p>
      </DialogContent>
    </Dialog>
  )
}
