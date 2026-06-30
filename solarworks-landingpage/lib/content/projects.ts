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
    image:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80",
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
    image:
      "https://images.unsplash.com/photo-1605980776566-0486c3ac7617?auto=format&fit=crop&w=1200&q=80",
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
    image:
      "https://images.unsplash.com/photo-1559302504-64aae6ca6b6d?auto=format&fit=crop&w=1200&q=80",
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
    image:
      "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&w=1200&q=80",
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
    image:
      "https://images.unsplash.com/photo-1497440001374-f26997328c1b?auto=format&fit=crop&w=1200&q=80",
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
    image:
      "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?auto=format&fit=crop&w=1200&q=80",
    featured: false,
  },
]

export const featuredProjects = projects.filter((p) => p.featured)
