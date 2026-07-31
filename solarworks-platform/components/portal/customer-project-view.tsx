import { Check, FileText, ExternalLink } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  PROJECT_STAGES,
  STAGE_LABEL,
  STAGE_DESCRIPTION,
  stageIndex,
  type CustomerProject,
} from "@/lib/customer-projects-shared"
import { Card, CardContent } from "@/components/ui/card"

/**
 * Read-only customer view of one project: where the installation stands and the
 * documents the team has shared. Presentational only — all data is fetched and
 * owner-scoped server-side by the portal page.
 */
export function CustomerProjectView({ project }: { project: CustomerProject }) {
  const current = stageIndex(project.stage)

  return (
    <div className="grid gap-4">
      <Card>
        <CardContent className="grid gap-1 py-5">
          <h2 className="font-heading text-lg font-semibold">{project.displayName}</h2>
          {project.siteAddress ? (
            <p className="text-sm text-muted-foreground">{project.siteAddress}</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-5">
          <p className="mb-4 text-sm font-medium">Your installation progress</p>
          <ol className="grid gap-0">
            {PROJECT_STAGES.map((stage, i) => {
              const done = i < current
              const active = i === current
              const last = i === PROJECT_STAGES.length - 1
              return (
                <li key={stage} className="grid grid-cols-[auto_1fr] gap-x-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={cn(
                        "grid size-7 place-items-center rounded-full border text-xs font-semibold",
                        done && "border-primary bg-primary text-primary-foreground",
                        active && "border-primary bg-primary/10 text-foreground",
                        !done && !active && "border-input text-muted-foreground",
                      )}
                    >
                      {done ? <Check className="size-4" /> : i + 1}
                    </span>
                    {!last ? (
                      <span
                        className={cn(
                          "my-0.5 w-px flex-1",
                          i < current ? "bg-primary" : "bg-border",
                        )}
                      />
                    ) : null}
                  </div>
                  <div className={cn("pb-5", last && "pb-0")}>
                    <p
                      className={cn(
                        "text-sm font-medium",
                        !done && !active && "text-muted-foreground",
                      )}
                    >
                      {STAGE_LABEL[stage]}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {STAGE_DESCRIPTION[stage]}
                    </p>
                    {active && stage === "scheduled" && project.scheduledAt ? (
                      <p className="mt-1 text-sm font-medium">
                        {new Date(project.scheduledAt).toLocaleString("en-PH", {
                          dateStyle: "full",
                          timeStyle: "short",
                          timeZone: "Asia/Manila",
                        })}
                      </p>
                    ) : null}
                    {active && project.stageNote ? (
                      <p className="mt-1 rounded-md bg-muted px-3 py-2 text-sm">
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
        <CardContent className="py-5">
          <p className="mb-3 text-sm font-medium">Documents</p>
          {project.documents.length > 0 ? (
            <ul className="grid gap-2">
              {project.documents.map((doc) => (
                <li key={doc.id}>
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm transition-colors hover:bg-muted"
                  >
                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">{doc.label}</span>
                    <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
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
