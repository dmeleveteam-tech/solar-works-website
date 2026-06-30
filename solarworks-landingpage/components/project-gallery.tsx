"use client"

import * as React from "react"

import type { Project } from "@/lib/content/projects"
import { cn } from "@/lib/utils"
import { ProjectCard } from "@/components/project-card"
import { Reveal } from "@/components/reveal"

const filters = ["All", "Residential", "Commercial", "Farm"] as const

export function ProjectGallery({ projects }: { projects: Project[] }) {
  const [active, setActive] = React.useState<(typeof filters)[number]>("All")

  const visible = React.useMemo(
    () => (active === "All" ? projects : projects.filter((p) => p.category === active)),
    [active, projects],
  )

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter projects">
        {filters.map((f) => {
          const isActive = active === f
          return (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(f)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                "motion-safe:transition-transform active:scale-[0.97]",
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {f}
            </button>
          )
        })}
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((project, i) => (
          // key includes filter so cards re-mount and re-run the reveal on change
          <Reveal key={`${active}-${project.slug}`} delay={i * 50}>
            <ProjectCard project={project} />
          </Reveal>
        ))}
      </div>
    </div>
  )
}
