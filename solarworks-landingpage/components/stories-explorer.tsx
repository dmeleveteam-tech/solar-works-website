"use client"

import * as React from "react"

import {
  videoTestimonials,
  writtenTestimonials,
  type Audience,
} from "@/lib/content/testimonials"
import { cn } from "@/lib/utils"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Reveal } from "@/components/reveal"
import { VideoTestimonialCard } from "@/components/video-testimonial-card"
import { WrittenTestimonialCard } from "@/components/written-testimonial-card"

const audiences = ["All", "Residential", "Commercial", "Farm"] as const

export function StoriesExplorer() {
  const [audience, setAudience] = React.useState<(typeof audiences)[number]>("All")

  const matches = (a: Audience) => audience === "All" || a === audience
  const videos = videoTestimonials.filter((v) => matches(v.audience))
  const written = writtenTestimonials.filter((w) => matches(w.audience))

  return (
    <Tabs defaultValue="video" className="w-full gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <TabsList>
          <TabsTrigger value="video">Video stories</TabsTrigger>
          <TabsTrigger value="written">Written reviews</TabsTrigger>
        </TabsList>

        <div className="flex flex-wrap gap-2" aria-label="Filter by audience">
          {audiences.map((a) => {
            const isActive = audience === a
            return (
              <button
                key={a}
                type="button"
                aria-pressed={isActive}
                onClick={() => setAudience(a)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                  "motion-safe:transition-transform active:scale-[0.97]",
                  isActive
                    ? "border-primary bg-primary/10 text-foreground"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {a}
              </button>
            )
          })}
        </div>
      </div>

      <TabsContent value="video">
        {videos.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-3">
            {videos.map((item, i) => (
              <Reveal key={`${audience}-${item.id}`} delay={i * 60}>
                <VideoTestimonialCard item={item} />
              </Reveal>
            ))}
          </div>
        ) : (
          <EmptyState />
        )}
      </TabsContent>

      <TabsContent value="written">
        {written.length > 0 ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {written.map((item, i) => (
              <Reveal key={`${audience}-${item.id}`} delay={i * 60}>
                <WrittenTestimonialCard item={item} />
              </Reveal>
            ))}
          </div>
        ) : (
          <EmptyState />
        )}
      </TabsContent>
    </Tabs>
  )
}

function EmptyState() {
  return (
    <p className="rounded-2xl border border-dashed py-16 text-center text-muted-foreground">
      No stories in this category yet — check back soon.
    </p>
  )
}
