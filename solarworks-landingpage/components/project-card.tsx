import { MapPin, Zap, BatteryCharging } from "lucide-react"

import type { Project } from "@/lib/content/projects"
import { Photo } from "@/components/photo"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Card className="group/card h-full gap-0 pt-0">
      <Photo
        src={project.image}
        alt={`${project.title} — ${project.capacityKw}kW ${project.systemType} solar installation in ${project.location}`}
        className="aspect-[4/3] w-full"
        imgClassName="transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] motion-safe:group-hover/card:scale-[1.04]"
        sizes="(max-width: 768px) 100vw, 33vw"
      />
      <CardContent className="flex flex-col gap-3 pt-5">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">{project.category}</Badge>
          <Badge variant="outline">{project.systemType}</Badge>
        </div>
        <div>
          <h3 className="text-base font-semibold">{project.title}</h3>
          <p className="mt-0.5 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="size-3.5" /> {project.location}
          </p>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <span className="inline-flex items-center gap-1.5">
            <Zap className="size-3.5 text-primary" /> {project.capacityKw} kW
          </span>
          {project.batteryKwh ? (
            <span className="inline-flex items-center gap-1.5">
              <BatteryCharging className="size-3.5 text-primary" /> {project.batteryKwh} kWh
            </span>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">{project.scope}</p>
        <p className="mt-auto border-t pt-3 text-sm font-medium text-pretty">
          {project.outcome}
        </p>
      </CardContent>
    </Card>
  )
}
