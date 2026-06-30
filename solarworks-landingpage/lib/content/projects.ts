export type Project = {
  slug: string
  title: string
  category: "Residential" | "Commercial" | "Farm"
  systemType: "Grid-Tied" | "Hybrid"
  capacityKw: number
  batteryKwh?: number
  location: string
  scope: string
  outcome: string
  image: string
  featured: boolean
}

export const projects: Project[] = [
  {
    slug: "tagaytay-hybrid-home",
    title: "Hillside Family Home",
    category: "Residential",
    systemType: "Hybrid",
    capacityKw: 8.2,
    batteryKwh: 10,
    location: "Tagaytay, Cavite",
    scope: "Rooftop hybrid system with battery backup for a four-bedroom home prone to brownouts.",
    outcome: "Roughly 70% lower monthly bill and uninterrupted power during outages.",
    image: "",
    featured: true,
  },
  {
    slug: "batangas-resort",
    title: "Lakeside Resort",
    category: "Commercial",
    systemType: "Grid-Tied",
    capacityKw: 45,
    location: "San Juan, Batangas",
    scope: "Ground-mount and rooftop array sized around peak daytime guest load.",
    outcome: "Significant cut in daytime grid draw across the dry season.",
    image: "",
    featured: true,
  },
  {
    slug: "laguna-grid-tied",
    title: "Suburban Grid-Tied Home",
    category: "Residential",
    systemType: "Grid-Tied",
    capacityKw: 6,
    location: "Santa Rosa, Laguna",
    scope: "Clean rooftop install with net-metering on a modern two-storey home.",
    outcome: "Daytime consumption almost fully offset by solar.",
    image: "",
    featured: true,
  },
  {
    slug: "quezon-poultry-farm",
    title: "Poultry Farm",
    category: "Farm",
    systemType: "Hybrid",
    capacityKw: 30,
    batteryKwh: 40,
    location: "Lucena, Quezon",
    scope: "Hybrid system keeping ventilation and cooling running through outages.",
    outcome: "Protected livestock from heat events during grid failures.",
    image: "",
    featured: false,
  },
  {
    slug: "cavite-school",
    title: "Private School Campus",
    category: "Commercial",
    systemType: "Grid-Tied",
    capacityKw: 60,
    location: "Dasmariñas, Cavite",
    scope: "Multi-building rooftop array sized to weekday classroom load.",
    outcome: "Lower operating cost redirected to learning programs.",
    image: "",
    featured: false,
  },
  {
    slug: "manila-carport",
    title: "Residential Solar Carport",
    category: "Residential",
    systemType: "Hybrid",
    capacityKw: 7.5,
    batteryKwh: 10,
    location: "Quezon City, Metro Manila",
    scope: "Carport-mounted array with battery and EV-ready charging point.",
    outcome: "Shade, backup power, and EV charging from one structure.",
    image: "",
    featured: false,
  },
]

export const featuredProjects = projects.filter((p) => p.featured)
