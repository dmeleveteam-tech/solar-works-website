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

export function VideoTestimonialCard({ item }: { item: VideoTestimonial }) {
  return (
    <Dialog
      onOpenChange={(open) => {
        if (open) track(ANALYTICS_EVENTS.testimonialVideoPlay, { name: item.name })
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className="group/card relative block w-full overflow-hidden rounded-2xl border bg-card text-left shadow-sm transition-shadow duration-200 hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          aria-label={`Play ${item.name}'s story`}
        >
          <div className="relative aspect-[4/3] overflow-hidden">
            <Photo
              src={item.thumbnail}
              alt={`${item.name} — ${item.systemType} solar story`}
              className="absolute inset-0 size-full transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] motion-safe:group-hover/card:scale-[1.04]"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
            <span className="absolute top-3 left-3">
              <Badge variant="secondary" className="bg-background/85 backdrop-blur">
                {item.systemType}
              </Badge>
            </span>
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
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{item.name}</DialogTitle>
          <DialogDescription>
            {item.location ? `${item.location} · ` : ""}
            {item.systemType} system
          </DialogDescription>
        </DialogHeader>
        <div className="relative aspect-video overflow-hidden rounded-xl bg-gradient-to-br from-primary/20 via-muted to-secondary">
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <span className="mx-auto grid size-16 place-items-center rounded-full bg-background/90 text-primary shadow-lg">
                <Play className="size-7 translate-x-0.5 fill-current" />
              </span>
              <p className="mt-4 px-6 text-sm text-muted-foreground">
                Video preview placeholder — a YouTube / Vimeo embed loads here in production.
              </p>
            </div>
          </div>
        </div>
        <p className="text-pretty text-muted-foreground">{item.summary}</p>
      </DialogContent>
    </Dialog>
  )
}
