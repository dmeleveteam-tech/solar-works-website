"use client"

import * as React from "react"
import Link from "next/link"
import { Check, ArrowRight } from "lucide-react"

import { cn } from "@/lib/utils"
import { siteConfig } from "@/lib/site-config"
import { Button } from "@/components/ui/button"

type Segment = "Residential" | "Commercial"

type Package = {
  name: string
  forWho: string
  solution: string
  highlights: string[]
  featured?: boolean
}

const PACKAGES: Record<Segment, Package[]> = {
  Residential: [
    {
      name: "Essential Grid-Tied",
      forWho: "Stable grid, lowest upfront cost",
      solution: "grid-tied",
      highlights: [
        "Sized to your real consumption",
        "Tier-1 panels + reputable inverter",
        "Net-metering application handled",
        "20-year panel warranty",
        "Lifetime after-sales support",
      ],
    },
    {
      name: "Hybrid + Battery",
      forWho: "Keep the lights on through outages",
      solution: "hybrid-with-battery",
      featured: true,
      highlights: [
        "Everything in Essential",
        "Battery backup during brownouts",
        "Use solar energy after sunset",
        "Smart load prioritization",
        "10-year battery warranty",
      ],
    },
  ],
  Commercial: [
    {
      name: "SME & Farm",
      forWho: "Cut your largest controllable cost",
      solution: "commercial-farm-carport",
      highlights: [
        "Designed around your load profile",
        "Roof, ground-mount, or carport",
        "Measurable operating-cost reduction",
        "Monitoring + performance reporting",
        "Lifetime after-sales support",
      ],
    },
    {
      name: "Resilient Commercial",
      forWho: "Generation plus energy resilience",
      solution: "hybrid-with-battery",
      featured: true,
      highlights: [
        "Everything in SME & Farm",
        "Battery storage for critical loads",
        "EV-charging ready carports",
        "Phased rollout options",
        "Dedicated account support",
      ],
    },
  ],
}

export function Packages() {
  const [segment, setSegment] = React.useState<Segment>("Residential")
  const packages = PACKAGES[segment]

  return (
    <div>
      {/* Segment toggle (the brief's monthly/yearly toggle, adapted) */}
      <div className="mx-auto flex w-fit items-center gap-1 rounded-full bg-muted p-1">
        {(["Residential", "Commercial"] as Segment[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSegment(s)}
            aria-pressed={segment === s}
            className={cn(
              "rounded-full px-5 py-2 text-sm font-medium transition-colors",
              segment === s
                ? "bg-background text-foreground shadow-sm ring-1 ring-foreground/10"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="mx-auto mt-10 grid max-w-4xl gap-6 sm:grid-cols-2">
        {packages.map((pkg) => (
          <div
            key={pkg.name}
            className={cn(
              "flex flex-col rounded-3xl p-8 ring-1 transition-shadow",
              pkg.featured
                ? "bg-card shadow-md ring-primary/40"
                : "bg-card shadow-sm ring-foreground/10",
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-heading text-xl font-bold tracking-tight">
                {pkg.name}
              </h3>
              {pkg.featured ? (
                <span className="section-label rounded-full bg-primary/15 px-2.5 py-1 text-primary-strong">
                  Popular
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{pkg.forWho}</p>

            <p className="mt-5 font-heading text-2xl font-bold tracking-tight">
              Custom quote
              <span className="ml-1 text-sm font-medium text-muted-foreground">
                / from your bill
              </span>
            </p>

            <ul className="mt-6 flex flex-1 flex-col gap-3 text-sm">
              {pkg.highlights.map((h) => (
                <li key={h} className="flex items-start gap-2.5">
                  <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{h}</span>
                </li>
              ))}
            </ul>

            <Button
              asChild
              variant={pkg.featured ? "default" : "outline"}
              size="lg"
              className="mt-8"
            >
              <Link href={`${siteConfig.primaryCta.href}?solution=${pkg.solution}`}>
                Get an assessment
                <ArrowRight />
              </Link>
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
