import { CalendarClock, Check, ExternalLink, FileText, MapPin } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  PROJECT_STAGES,
  STAGE_LABEL,
  STAGE_DESCRIPTION,
  stageIndex,
  type CustomerProject,
} from "@/lib/customer-projects-shared"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

/**
 * Read-only customer view of one project: where the installation stands and the
 * documents the team has shared. Presentational only — all data is fetched and
 * owner-scoped server-side by the portal page.
 */
export function CustomerProjectView({ project }: { project: CustomerProject }) {
  const current = stageIndex(project.stage)
  const total = PROJECT_STAGES.length
  const showSchedule = project.stage === "scheduled" && project.scheduledAt

  return (
    <div className="grid gap-4">
      <Card className="gap-0 py-0">
        <div className="relative grain bg-solar-hero px-6 py-7">
          <p className="section-label">Your installation</p>
          <h2 className="text-display mt-2 text-2xl">{project.displayName}</h2>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
            <Badge tone="brand" shape="pill">
              {STAGE_LABEL[project.stage]}
            </Badge>
            <span className="tabular text-sm text-muted-foreground">
              Step {current + 1} of {total}
            </span>
            {project.siteAddress ? (
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="size-3.5 shrink-0" aria-hidden />
                {project.siteAddress}
              </span>
            ) : null}
          </div>
        </div>

        {/* The booked date is the one fact a customer opens this page to check,
            so it sits above the stepper rather than inside it. */}
        {showSchedule ? (
          <div className="flex items-start gap-3 border-t bg-warning-soft/60 px-6 py-5">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-background text-warning shadow-e1">
              <CalendarClock className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium">Your installation is booked for</p>
              <p className="tabular font-heading mt-0.5 text-lg font-semibold">
                {new Date(project.scheduledAt as string).toLocaleString("en-PH", {
                  dateStyle: "full",
                  timeStyle: "short",
                  timeZone: "Asia/Manila",
                })}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Philippine time. We will contact you if anything needs to move.
              </p>
            </div>
          </div>
        ) : null}

        <CardContent className="border-t py-7">
          <p className="section-label mb-6">Your progress</p>

          {/* Wide screens read the timeline left-to-right; narrow screens keep
              the stacked list, where the per-stage copy still fits. */}
          <ol className="hidden md:grid" style={{ gridTemplateColumns: `repeat(${total}, minmax(0,1fr))` }}>
            {PROJECT_STAGES.map((stage, i) => {
              const done = i < current
              const active = i === current
              return (
                <li key={stage} className="flex flex-col items-center text-center">
                  <div className="flex w-full items-center">
                    <span
                      aria-hidden
                      className={cn(
                        "h-0.5 flex-1 rounded-full",
                        i === 0 && "opacity-0",
                        i <= current ? "bg-primary" : "bg-border",
                      )}
                    />
                    <StepNode done={done} active={active} index={i} />
                    <span
                      aria-hidden
                      className={cn(
                        "h-0.5 flex-1 rounded-full",
                        i === total - 1 && "opacity-0",
                        i < current ? "bg-primary" : "bg-border",
                      )}
                    />
                  </div>
                  <p
                    className={cn(
                      "mt-3 px-1 text-sm font-medium text-balance",
                      done && "text-muted-foreground",
                      !done && !active && "text-muted-foreground",
                    )}
                  >
                    {STAGE_LABEL[stage]}
                  </p>
                  {/* Status in words, not colour alone. */}
                  <span className="sr-only">
                    {done ? "Completed" : active ? "Current step" : "Not started"}
                  </span>
                  {active ? (
                    <Badge tone="brand" shape="pill" size="sm" className="mt-1.5">
                      You are here
                    </Badge>
                  ) : null}
                </li>
              )
            })}
          </ol>

          <div className="mt-7 hidden rounded-xl bg-muted/60 px-4 py-3.5 md:block">
            <p className="text-sm font-medium">{STAGE_LABEL[project.stage]}</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {STAGE_DESCRIPTION[project.stage]}
            </p>
            {project.stageNote ? (
              <p className="mt-2.5 border-l-2 border-primary/50 pl-3 text-sm">
                {project.stageNote}
              </p>
            ) : null}
          </div>

          <ol className="grid gap-0 md:hidden">
            {PROJECT_STAGES.map((stage, i) => {
              const done = i < current
              const active = i === current
              const last = i === total - 1
              return (
                <li key={stage} className="grid grid-cols-[auto_1fr] gap-x-4">
                  <div className="flex flex-col items-center">
                    <StepNode done={done} active={active} index={i} />
                    {!last ? (
                      <span
                        aria-hidden
                        className={cn(
                          "my-1 w-0.5 flex-1 rounded-full",
                          i < current ? "bg-primary" : "bg-border",
                        )}
                      />
                    ) : null}
                  </div>
                  <div className={cn("pb-6", last && "pb-0")}>
                    <p
                      className={cn(
                        "text-sm font-medium",
                        !done && !active && "text-muted-foreground",
                      )}
                    >
                      {STAGE_LABEL[stage]}
                      <span className="sr-only">
                        {" — "}
                        {done ? "Completed" : active ? "Current step" : "Not started"}
                      </span>
                    </p>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      {STAGE_DESCRIPTION[stage]}
                    </p>
                    {active ? (
                      <Badge tone="brand" shape="pill" size="sm" className="mt-2">
                        You are here
                      </Badge>
                    ) : null}
                    {active && project.stageNote ? (
                      <p className="mt-2 rounded-lg bg-muted px-3 py-2 text-sm">
                        {project.stageNote}
                      </p>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <p className="section-label mb-4">Documents</p>
          {project.documents.length > 0 ? (
            <ul className="grid gap-2">
              {project.documents.map((doc) => (
                <li key={doc.id}>
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group/doc flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm outline-none transition-colors duration-200 hover:border-primary/30 hover:bg-primary/5 focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-neutral-soft text-muted-foreground transition-colors group-hover/doc:bg-primary/15 group-hover/doc:text-primary-strong">
                      <FileText className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {doc.label}
                    </span>
                    <ExternalLink
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden
                    />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No documents yet. Your adviser will share your proposal and other
              documents here.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

/** One stepper node. Shared by the horizontal and stacked layouts. */
function StepNode({
  done,
  active,
  index,
}: {
  done: boolean
  active: boolean
  index: number
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-full text-sm font-semibold transition-colors",
        done && "bg-primary text-primary-foreground shadow-e1",
        active &&
          "bg-background text-primary-strong ring-2 ring-primary shadow-e2 ring-offset-2 ring-offset-card",
        !done && !active && "border border-input bg-background text-muted-foreground",
      )}
    >
      {done ? <Check className="size-5" /> : index + 1}
    </span>
  )
}
