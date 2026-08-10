"use client"

import * as React from "react"
import { BatteryCharging, ImageIcon, MapPin, Play, Quote, Zap } from "lucide-react"

import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"

/**
 * Read-only preview of how a content item appears on the public marketing site.
 *
 * The real cards live in the separate `solarworks-landingpage` repo and can't be
 * imported here, so these are faithful in-platform reproductions of
 * `project-card`, `written-testimonial-card`, and `video-testimonial-card`. They
 * approximate the public look closely enough to catch obvious mistakes (wrong
 * image, truncated copy) before publishing — they are not pixel-perfect.
 */
export type PreviewState =
  | { kind: "project"; data: ProjectPreview }
  | { kind: "testimonial"; data: TestimonialPreview }
  | { kind: "faq"; data: FaqPreview }

export type ProjectPreview = {
  title: string
  category: string
  systemType: string
  capacityKw: string
  batteryKwh: string
  location: string
  scope: string
  outcome: string
  image: string
}

export type TestimonialPreview = {
  kind: "video" | "written"
  name: string
  location: string
  systemType: string
  headline: string
  summary: string
  thumbnail: string
  quote: string
  photo: string
  sourceUrl: string
}

export type FaqPreview = { question: string; answer: string; category: string }

const TITLE: Record<PreviewState["kind"], string> = {
  project: "Project preview",
  testimonial: "Testimonial preview",
  faq: "FAQ preview",
}

export function ContentPreview({
  preview,
  onOpenChange,
}: {
  preview: PreviewState | null
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Sheet open={preview != null} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{preview ? TITLE[preview.kind] : "Preview"}</SheetTitle>
          <SheetDescription>
            Approximate preview of how this appears on the public site. Final styling
            may differ slightly.
          </SheetDescription>
        </SheetHeader>
        <div className="overflow-y-auto px-4 pb-6">
          {preview?.kind === "project" ? <ProjectPreviewCard data={preview.data} /> : null}
          {preview?.kind === "testimonial" ? (
            <TestimonialPreviewCard data={preview.data} />
          ) : null}
          {preview?.kind === "faq" ? <FaqPreviewItem data={preview.data} /> : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}

// --- shared bits ------------------------------------------------------------

function Badge({
  variant = "secondary",
  children,
}: {
  variant?: "secondary" | "outline"
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
        variant === "secondary"
          ? "bg-secondary text-secondary-foreground"
          : "border text-foreground",
      )}
    >
      {children}
    </span>
  )
}

/** Image with a graceful fallback when the URL is empty or fails to load. */
function PreviewImage({ src, className }: { src: string; className?: string }) {
  // Track the src that failed (rather than a boolean reset by an effect) so a new
  // src is considered loadable again without a setState-in-effect.
  const [failedSrc, setFailedSrc] = React.useState<string | null>(null)

  if (!src || failedSrc === src) {
    return (
      <div className={cn("grid place-items-center bg-muted text-muted-foreground", className)}>
        <ImageIcon className="size-6" />
      </div>
    )
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className={cn("object-cover", className)}
      onError={() => setFailedSrc(src)}
    />
  )
}

// --- project ----------------------------------------------------------------

function ProjectPreviewCard({ data }: { data: ProjectPreview }) {
  return (
    <Card className="gap-0 overflow-hidden pt-0">
      <PreviewImage src={data.image} className="aspect-[4/3] w-full" />
      <CardContent className="flex flex-col gap-3 pt-5">
        <div className="flex flex-wrap gap-2">
          {data.category ? <Badge>{data.category}</Badge> : null}
          {data.systemType ? <Badge variant="outline">{data.systemType}</Badge> : null}
        </div>
        <div>
          <h3 className="text-base font-semibold">{data.title || "Untitled project"}</h3>
          {data.location ? (
            <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="size-3.5" /> {data.location}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {data.capacityKw ? (
            <span className="inline-flex items-center gap-1.5">
              <Zap className="size-3.5 text-primary" /> {data.capacityKw} kW
            </span>
          ) : null}
          {data.batteryKwh ? (
            <span className="inline-flex items-center gap-1.5">
              <BatteryCharging className="size-3.5 text-primary" /> {data.batteryKwh} kWh
            </span>
          ) : null}
        </div>
        {data.scope ? <p className="text-sm text-muted-foreground">{data.scope}</p> : null}
        {data.outcome ? (
          <p className="mt-auto border-t pt-3 text-sm font-medium text-pretty">{data.outcome}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}

// --- testimonials -----------------------------------------------------------

function initials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

function TestimonialPreviewCard({ data }: { data: TestimonialPreview }) {
  if (data.kind === "video") {
    return (
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <div className="relative aspect-[4/3]">
          <PreviewImage src={data.thumbnail} className="absolute inset-0 size-full" />
          {data.systemType ? (
            <span className="absolute top-3 left-3">
              <span className="inline-flex items-center rounded-md bg-background/85 px-2 py-0.5 text-xs font-medium backdrop-blur">
                {data.systemType}
              </span>
            </span>
          ) : null}
          <span className="absolute inset-0 grid place-items-center">
            <span className="grid size-14 place-items-center rounded-full bg-background/90 text-primary shadow-lg">
              <Play className="size-6 translate-x-0.5 fill-current" />
            </span>
          </span>
          <div className="absolute bottom-3 left-3 rounded-lg bg-background/85 px-2.5 py-1.5 backdrop-blur">
            <p className="text-sm font-semibold">{data.name || "Customer"}</p>
            {data.location ? (
              <p className="text-xs text-muted-foreground">{data.location}</p>
            ) : null}
          </div>
        </div>
        <div className="p-4">
          <p className="font-medium text-balance">{data.headline || "Headline"}</p>
          {data.summary ? (
            <p className="mt-1.5 text-sm text-muted-foreground">{data.summary}</p>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <Card className="h-full">
      <CardContent className="flex h-full flex-col gap-5">
        <Quote className="size-7 text-primary/40" aria-hidden />
        <p className="flex-1 leading-relaxed text-pretty">{data.quote || "Quote goes here."}</p>
        <div className="flex items-center gap-3 border-t pt-4">
          <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-muted text-sm font-medium">
            {data.photo ? (
              <PreviewImage src={data.photo} className="size-full" />
            ) : (
              initials(data.name) || "—"
            )}
          </span>
          <div className="text-sm">
            <p className="font-medium">{data.name || "Customer"}</p>
            <p className="text-muted-foreground">
              {[data.location, data.systemType].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>
        {data.sourceUrl ? (
          <a
            href={data.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-medium text-primary hover:underline"
          >
            View original review ↗
          </a>
        ) : null}
      </CardContent>
    </Card>
  )
}

// --- faq --------------------------------------------------------------------

function FaqPreviewItem({ data }: { data: FaqPreview }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2">
        {data.category ? (
          <span className="w-fit">
            <Badge variant="outline">{data.category}</Badge>
          </span>
        ) : null}
        <h3 className="font-medium">{data.question || "Question?"}</h3>
        <p className="leading-relaxed text-muted-foreground">{data.answer || "Answer."}</p>
      </CardContent>
    </Card>
  )
}
