import type { LucideIcon } from "lucide-react"
import { Sun, BatteryCharging, Building2, Car } from "lucide-react"

/**
 * Shape returned by the platform CMS's `/api/content/solutions` (and used as
 * the fallback below when that call is unavailable — see `./api`). Icons
 * aren't part of the CMS data (a Lucide component can't cross a JSON API), so
 * they're looked up locally by slug via `solutionIcon()`.
 */
export type Solution = {
  slug: string
  name: string
  forWho: string
  summary: string
  highlights: string[]
  image: string
}

/** Icon shown on each solution card, keyed by slug; unknown slugs fall back to `Sun`. */
const SOLUTION_ICONS: Record<string, LucideIcon> = {
  "grid-tied": Sun,
  "hybrid-with-battery": BatteryCharging,
  "commercial-farm-carport": Building2,
  "solar-carport": Car,
}

export function solutionIcon(slug: string): LucideIcon {
  return SOLUTION_ICONS[slug] ?? Sun
}

// Fallback content, used when the CMS is unreachable or has nothing published
// yet. Real photos are added from the platform's Content → Solutions editor.
export const solutions: Solution[] = [
  {
    slug: "grid-tied",
    name: "Grid-Tied Solar",
    forWho: "Homes with stable grid power that want lower bills",
    summary:
      "The most cost-effective way to cut your electricity bill. Your panels offset daytime consumption and feed surplus back to the grid.",
    highlights: [
      "Lowest upfront cost per kW",
      "Fastest payback period",
      "Net-metering ready",
    ],
    image: "",
  },
  {
    slug: "hybrid-with-battery",
    name: "Hybrid with Battery",
    forWho: "Homes that need backup power during outages",
    summary:
      "Combine solar with battery storage so you keep the lights on when the grid goes down, and store cheap daytime energy for the evening.",
    highlights: [
      "Backup power during brownouts",
      "Use solar energy after sunset",
      "Smart load prioritization",
    ],
    image: "",
  },
  {
    slug: "commercial-farm-carport",
    name: "Commercial, Farm & Carport",
    forWho: "Resorts, schools, farms, and SMEs cutting operating costs",
    summary:
      "Engineered around your operational load. Reduce the single largest controllable cost in your business while strengthening energy resilience.",
    highlights: [
      "Designed around your load profile",
      "Roof, ground-mount, or carport",
      "Measurable operating-cost reduction",
    ],
    image: "",
  },
  {
    slug: "solar-carport",
    name: "Solar Carport",
    forWho: "Properties that want generation plus shade and EV-ready parking",
    summary:
      "Turn unused parking into a power plant. Generate clean energy, shade vehicles, and prepare for EV charging, all from one structure.",
    highlights: [
      "Dual-purpose: power + shade",
      "EV-charging ready",
      "No roof space required",
    ],
    image: "",
  },
]
