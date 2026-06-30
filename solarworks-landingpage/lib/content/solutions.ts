import type { LucideIcon } from "lucide-react"
import { Sun, BatteryCharging, Building2, Car } from "lucide-react"

export type Solution = {
  slug: string
  name: string
  icon: LucideIcon
  forWho: string
  summary: string
  highlights: string[]
  image: string
}

export const solutions: Solution[] = [
  {
    slug: "grid-tied",
    name: "Grid-Tied Solar",
    icon: Sun,
    forWho: "Homes with stable grid power that want lower bills",
    summary:
      "The most cost-effective way to cut your electricity bill. Your panels offset daytime consumption and feed surplus back to the grid.",
    highlights: [
      "Lowest upfront cost per kW",
      "Fastest payback period",
      "Net-metering ready",
    ],
    image:
      "https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=1200&q=80",
  },
  {
    slug: "hybrid-with-battery",
    name: "Hybrid with Battery",
    icon: BatteryCharging,
    forWho: "Homes that need backup power during outages",
    summary:
      "Combine solar with battery storage so you keep the lights on when the grid goes down — and store cheap daytime energy for the evening.",
    highlights: [
      "Backup power during brownouts",
      "Use solar energy after sunset",
      "Smart load prioritization",
    ],
    image:
      "https://images.unsplash.com/photo-1466611653911-95081537e5b7?auto=format&fit=crop&w=1200&q=80",
  },
  {
    slug: "commercial-farm-carport",
    name: "Commercial, Farm & Carport",
    icon: Building2,
    forWho: "Resorts, schools, farms, and SMEs cutting operating costs",
    summary:
      "Engineered around your operational load. Reduce the single largest controllable cost in your business while strengthening energy resilience.",
    highlights: [
      "Designed around your load profile",
      "Roof, ground-mount, or carport",
      "Measurable operating-cost reduction",
    ],
    image:
      "https://images.unsplash.com/photo-1605980776566-0486c3ac7617?auto=format&fit=crop&w=1200&q=80",
  },
  {
    slug: "solar-carport",
    name: "Solar Carport",
    icon: Car,
    forWho: "Properties that want generation plus shade and EV-ready parking",
    summary:
      "Turn unused parking into a power plant. Generate clean energy, shade vehicles, and prepare for EV charging — all from one structure.",
    highlights: [
      "Dual-purpose: power + shade",
      "EV-charging ready",
      "No roof space required",
    ],
    image:
      "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=1200&q=80",
  },
]
