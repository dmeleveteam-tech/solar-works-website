"use client"

import * as React from "react"
import { CldUploadWidget } from "next-cloudinary"
import {
  CalendarClock,
  ChevronDown,
  ExternalLink,
  FileText,
  FolderKanban,
  Loader2,
  Plus,
  Trash2,
  Upload,
  UserRound,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { CLOUDINARY_SIGN_ENDPOINT, CLOUDINARY_UPLOAD_OPTIONS } from "@/lib/cloudinary-upload"
import {
  PROJECT_STAGES,
  STAGE_LABEL,
  stageIndex,
  type CustomerProject,
  type ProjectStage,
} from "@/lib/customer-projects-shared"
import {
  createProject,
  updateProjectStage,
  addDocument,
  removeDocument,
  removeProject,
  type ActionResult,
} from "@/app/dashboard/projects/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select } from "@/components/ui/select"
import { EmptyState } from "@/components/ui/empty-state"
import { ConfirmButton } from "@/components/ui/confirm-button"
import { Card, CardContent } from "@/components/ui/card"

// `next-cloudinary`'s CldUploadWidget throws during render (not just on
// upload) when this is unset, which used to take the whole expanded project
// card down with it — including the status editor rendered next to it. Guard
// on the same public env var so a missing Cloudinary config degrades to a
// disabled button instead of crashing the row.
const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME

/**
 * Stage → semantic tone. The ramp tracks progress rather than labelling each
 * stage a different colour for its own sake: cool and quiet while the job is
 * still paperwork, warm once it's a committed date, green once power flows.
 */
const STAGE_TONE: Record<ProjectStage, React.ComponentProps<typeof Badge>["tone"]> = {
  assessment: "neutral",
  proposal: "info",
  scheduled: "warning",
  installed: "brand",
  energized: "success",
  after_sales: "success",
}

/** Fill for the *current* segment of the progress bar, matching STAGE_TONE. */
const STAGE_FILL: Record<ProjectStage, string> = {
  assessment: "bg-muted-foreground",
  proposal: "bg-info",
  scheduled: "bg-warning",
  installed: "bg-primary",
  energized: "bg-success",
  after_sales: "bg-success",
}

/**
 * Installation times are always quoted in Philippine time — pinning the zone
 * (rather than rendering in the viewer's) also keeps the server and client
 * markup identical, so this can render inside the SSR'd row without a mismatch.
 */
function formatSchedule(iso: string, style: "short" | "long" = "short") {
  return new Date(iso).toLocaleString("en-PH", {
    dateStyle: style === "short" ? "medium" : "full",
    timeStyle: "short",
    timeZone: "Asia/Manila",
  })
}

export function ProjectsManager({
  initialProjects,
  canDelete,
}: {
  initialProjects: CustomerProject[]
  canDelete: boolean
}) {
  const [projects, setProjects] = React.useState(initialProjects)
  const [adding, setAdding] = React.useState(false)
  const [filter, setFilter] = React.useState<ProjectStage | "all">("all")

  function upsert(updated: CustomerProject) {
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
  }

  const counts = React.useMemo(() => {
    const map = {} as Record<ProjectStage, number>
    for (const stage of PROJECT_STAGES) map[stage] = 0
    for (const p of projects) map[p.stage] += 1
    return map
  }, [projects])

  const visible = React.useMemo(
    () => (filter === "all" ? projects : projects.filter((p) => p.stage === filter)),
    [projects, filter],
  )

  const scheduledCount = counts.scheduled
  const liveCount = counts.energized + counts.after_sales

  const newProjectButton = (
    <Button size="sm" onClick={() => setAdding((v) => !v)}>
      {adding ? <X /> : <Plus />}
      {adding ? "Cancel" : "New project"}
    </Button>
  )

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1.5">
          <p className="section-label">Pipeline</p>
          <p className="text-sm text-muted-foreground">
            <span className="tabular font-medium text-foreground">
              {projects.length}
            </span>{" "}
            {projects.length === 1 ? "project" : "projects"}
            {scheduledCount > 0 ? (
              <>
                {" · "}
                <span className="tabular font-medium text-foreground">
                  {scheduledCount}
                </span>{" "}
                scheduled
              </>
            ) : null}
            {liveCount > 0 ? (
              <>
                {" · "}
                <span className="tabular font-medium text-foreground">
                  {liveCount}
                </span>{" "}
                energized
              </>
            ) : null}
          </p>
        </div>

        <div className="flex items-end gap-2">
          <div className="grid gap-1.5">
            <Label htmlFor="stage-filter" className="sr-only">
              Filter by stage
            </Label>
            <Select
              id="stage-filter"
              className="sm:w-52"
              value={filter}
              onChange={(e) => setFilter(e.target.value as ProjectStage | "all")}
            >
              <option value="all">All stages ({projects.length})</option>
              {PROJECT_STAGES.map((s) => (
                <option key={s} value={s}>
                  {STAGE_LABEL[s]} ({counts[s]})
                </option>
              ))}
            </Select>
          </div>
          {newProjectButton}
        </div>
      </div>

      {adding ? (
        <CreateProjectForm
          onCreated={(project) => {
            setProjects((prev) => [project, ...prev])
            setAdding(false)
            setFilter("all")
          }}
        />
      ) : null}

      {projects.length === 0 ? (
        <Card>
          <EmptyState
            icon={FolderKanban}
            title="No customer projects yet"
            description="Convert a lead from the leads inbox, or create a project directly for a customer you already know."
            action={newProjectButton}
          />
        </Card>
      ) : visible.length === 0 ? (
        <Card>
          <EmptyState
            icon={FolderKanban}
            title={`Nothing at ${STAGE_LABEL[filter as ProjectStage].toLowerCase()}`}
            description="No project sits at this stage right now. Pick another stage to keep looking."
            action={
              <Button size="sm" variant="outline" onClick={() => setFilter("all")}>
                Show all stages
              </Button>
            }
          />
        </Card>
      ) : (
        visible.map((project) => (
          <ProjectCard
            key={project.id}
            project={project}
            canDelete={canDelete}
            onChange={upsert}
            onDeleted={(id) =>
              setProjects((prev) => prev.filter((p) => p.id !== id))
            }
          />
        ))
      )}
    </div>
  )
}

/**
 * Segmented progress along the stage timeline. Collapsed rows carry it so staff
 * can scan how far every job has got without opening a single disclosure.
 */
function StageProgress({ stage, className }: { stage: ProjectStage; className?: string }) {
  const current = stageIndex(stage)
  const total = PROJECT_STAGES.length

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span aria-hidden className="flex flex-1 gap-0.5">
        {PROJECT_STAGES.map((s, i) => (
          <span
            key={s}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors duration-300",
              i < current && "bg-primary/45",
              i === current && STAGE_FILL[stage],
              i > current && "bg-border",
            )}
          />
        ))}
      </span>
      <span className="tabular text-[11px] text-muted-foreground">
        <span className="sr-only">Stage </span>
        {current + 1}/{total}
      </span>
    </div>
  )
}

// --- create -----------------------------------------------------------------

function CreateProjectForm({
  onCreated,
}: {
  onCreated: (project: CustomerProject) => void
}) {
  const [saving, setSaving] = React.useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const input = {
      name: String(fd.get("name") ?? "").trim(),
      email: String(fd.get("email") ?? "").trim(),
      phone: String(fd.get("phone") ?? "").trim(),
      displayName: String(fd.get("displayName") ?? "").trim(),
      siteAddress: String(fd.get("siteAddress") ?? "").trim(),
    }

    setSaving(true)
    const res = await createProject(input)
    setSaving(false)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    toast.success("Project created.")
    onCreated(res.data)
  }

  return (
    <Card className="gap-0 py-0 shadow-e2">
      <div className="relative grain flex items-center gap-3 border-b bg-solar-glow px-6 py-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary-strong ring-1 ring-primary/20">
          <FolderKanban className="size-4.5" />
        </span>
        <div className="min-w-0">
          <p className="font-heading text-sm font-semibold">New customer project</p>
          <p className="text-sm text-muted-foreground">
            The customer signs in with this email to follow their installation.
          </p>
        </div>
      </div>

      <CardContent className="py-5">
        <form onSubmit={onSubmit} className="grid gap-5">
          <fieldset className="grid gap-3">
            <legend className="section-label mb-1">Customer</legend>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="grid gap-1.5">
                <Label htmlFor="name">Customer name</Label>
                <Input id="name" name="name" required maxLength={120} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required maxLength={200} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="phone">Phone (optional)</Label>
                <Input id="phone" name="phone" maxLength={40} />
              </div>
            </div>
          </fieldset>

          <fieldset className="grid gap-3">
            <legend className="section-label mb-1">Installation</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="displayName">Project name</Label>
                <Input
                  id="displayName"
                  name="displayName"
                  required
                  maxLength={120}
                  placeholder="e.g. Dela Cruz residence — hybrid 8kW"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="siteAddress">Site address (optional)</Label>
                <Input id="siteAddress" name="siteAddress" maxLength={300} />
              </div>
            </div>
          </fieldset>

          <div className="flex items-center gap-3 border-t pt-4">
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : <Plus />}
              Create project
            </Button>
            <p className="text-xs text-muted-foreground">
              Starts at assessment. You can move the stage right after.
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

// --- per-project card -------------------------------------------------------

function ProjectCard({
  project,
  canDelete,
  onChange,
  onDeleted,
}: {
  project: CustomerProject
  canDelete: boolean
  onChange: (project: CustomerProject) => void
  onDeleted: (id: string) => void
}) {
  const [open, setOpen] = React.useState(false)
  const panelId = `project-panel-${project.id}`

  return (
    <Card size="sm" className="gap-0 py-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "w-full cursor-pointer px-4 py-3.5 text-left transition-colors duration-200",
          "hover:bg-[color-mix(in_oklch,var(--foreground)_3%,transparent)]",
          "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
          open && "bg-[color-mix(in_oklch,var(--foreground)_2%,transparent)]",
        )}
        aria-expanded={open}
        aria-controls={panelId}
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{project.displayName}</p>
            <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-muted-foreground">
              <UserRound className="size-3.5 shrink-0" aria-hidden />
              <span className="truncate">
                {project.customerName ? `${project.customerName} · ` : ""}
                {project.customerEmail}
              </span>
            </p>
          </div>

          {/* A booked install is a commitment — it stays on the collapsed row
              rather than hiding behind the disclosure. */}
          {project.stage === "scheduled" && project.scheduledAt ? (
            <Badge tone="warning" className="hidden md:inline-flex">
              <CalendarClock aria-hidden />
              <span className="tabular">{formatSchedule(project.scheduledAt)}</span>
            </Badge>
          ) : null}

          <Badge tone={STAGE_TONE[project.stage]} shape="pill">
            {STAGE_LABEL[project.stage]}
          </Badge>

          <ChevronDown
            aria-hidden
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]",
              open && "rotate-180",
            )}
          />
        </div>

        <StageProgress stage={project.stage} className="mt-3" />

        {project.stage === "scheduled" && project.scheduledAt ? (
          <p className="tabular mt-2 flex items-center gap-1.5 text-xs text-muted-foreground md:hidden">
            <CalendarClock className="size-3.5" aria-hidden />
            {formatSchedule(project.scheduledAt)}
          </p>
        ) : null}
      </button>

      {open ? (
        <div id={panelId} className="grid gap-6 border-t px-4 py-5">
          <StageEditor project={project} onChange={onChange} />
          <DocumentsEditor project={project} onChange={onChange} />
          {canDelete ? (
            <DeleteProject project={project} onDeleted={onDeleted} />
          ) : null}
        </div>
      ) : null}
    </Card>
  )
}

/** ISO datetime → the local value a `<input type="datetime-local">` expects. */
function toDatetimeLocal(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function StageEditor({
  project,
  onChange,
}: {
  project: CustomerProject
  onChange: (project: CustomerProject) => void
}) {
  const [stage, setStage] = React.useState<ProjectStage>(project.stage)
  const [note, setNote] = React.useState(project.stageNote ?? "")
  const [scheduledAt, setScheduledAt] = React.useState(toDatetimeLocal(project.scheduledAt))
  const [saving, setSaving] = React.useState(false)

  async function onSave() {
    setSaving(true)
    const res = await updateProjectStage({
      id: project.id,
      stage,
      stageNote: note,
      scheduledAt: stage === "scheduled" ? scheduledAt : "",
    })
    setSaving(false)
    handle(res, onChange, "Stage updated.")
  }

  return (
    <section className="grid gap-3">
      <p className="section-label">Status</p>
      <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
        <div className="grid gap-1.5">
          <Label htmlFor={`stage-${project.id}`}>Stage</Label>
          <Select
            id={`stage-${project.id}`}
            value={stage}
            onChange={(e) => setStage(e.target.value as ProjectStage)}
          >
            {PROJECT_STAGES.map((s) => (
              <option key={s} value={s}>
                {STAGE_LABEL[s]}
              </option>
            ))}
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor={`note-${project.id}`}>Note to customer (optional)</Label>
          <Input
            id={`note-${project.id}`}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={1000}
            placeholder="e.g. Install booked for the 14th."
          />
        </div>
      </div>
      {stage === "scheduled" ? (
        <div className="grid gap-1.5 rounded-lg bg-warning-soft/60 p-3 sm:max-w-[22rem]">
          <Label htmlFor={`sched-${project.id}`}>Installation date &amp; time</Label>
          <Input
            id={`sched-${project.id}`}
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
            className="bg-background"
            required
          />
          <p className="text-xs text-muted-foreground">
            Saving this emails the customer their schedule.
          </p>
        </div>
      ) : null}
      <div>
        <Button
          size="sm"
          onClick={onSave}
          disabled={saving || (stage === "scheduled" && !scheduledAt)}
        >
          {saving ? <Loader2 className="animate-spin" /> : null}
          Save status
        </Button>
      </div>
    </section>
  )
}

function DocumentsEditor({
  project,
  onChange,
}: {
  project: CustomerProject
  onChange: (project: CustomerProject) => void
}) {
  const [label, setLabel] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  // Capture the label at upload time so the async completion handler uses the
  // value as it was when the widget opened, not whatever it is at render.
  const labelRef = React.useRef("")

  async function onUploadSuccess(url: string) {
    const res = await addDocument({
      id: project.id,
      label: labelRef.current.trim() || "Document",
      url,
    })
    setBusy(false)
    if (handle(res, onChange, "Document added.")) setLabel("")
  }

  async function onRemove(documentId: string) {
    const res = await removeDocument({ id: project.id, documentId })
    handle(res, onChange, "Document removed.")
  }

  return (
    <section className="grid gap-3 border-t pt-5">
      <div className="flex items-center gap-2">
        <p className="section-label">Documents</p>
        {project.documents.length > 0 ? (
          <Badge tone="neutral" shape="pill" size="sm" className="tabular">
            {project.documents.length}
          </Badge>
        ) : null}
      </div>

      {project.documents.length > 0 ? (
        <ul className="grid gap-1.5">
          {project.documents.map((doc) => (
            <li
              key={doc.id}
              className="group/doc flex items-center gap-3 rounded-lg border px-2.5 py-2 text-sm transition-colors duration-200 hover:border-primary/30 hover:bg-primary/5"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-md bg-neutral-soft text-muted-foreground transition-colors group-hover/doc:bg-primary/15 group-hover/doc:text-primary-strong">
                <FileText className="size-4" aria-hidden />
              </span>
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 flex-1 truncate rounded-sm font-medium outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                {doc.label}
                <ExternalLink
                  aria-hidden
                  className="ml-1.5 inline size-3.5 align-[-2px] text-muted-foreground"
                />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove ${doc.label}`}
                onClick={() => onRemove(doc.id)}
                className="text-destructive hover:text-destructive"
              >
                <X />
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">No documents shared yet.</p>
      )}

      <div className="flex flex-wrap items-end gap-2">
        <div className="grid flex-1 gap-1.5">
          <Label htmlFor={`label-${project.id}`}>Document label</Label>
          <Input
            id={`label-${project.id}`}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={120}
            placeholder="e.g. Proposal (PDF)"
          />
        </div>
        {CLOUDINARY_CLOUD_NAME ? (
          <CldUploadWidget
            signatureEndpoint={CLOUDINARY_SIGN_ENDPOINT}
            options={CLOUDINARY_UPLOAD_OPTIONS.customerDocument}
            onOpen={() => {
              labelRef.current = label
              setBusy(true)
            }}
            onSuccess={(result) => {
              const info = typeof result.info === "object" ? result.info : undefined
              if (info?.secure_url) void onUploadSuccess(info.secure_url)
              else setBusy(false)
            }}
            onError={(err) => {
              setBusy(false)
              const message = typeof err === "string" ? err : (err as { statusText?: string })?.statusText
              toast.error(message || "Upload failed.")
            }}
          >
            {({ open, isLoading }) => (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={busy || isLoading}
                onClick={() => open()}
              >
                {busy || isLoading ? <Loader2 className="animate-spin" /> : <Upload />}
                Upload &amp; add
              </Button>
            )}
          </CldUploadWidget>
        ) : (
          <Button type="button" variant="outline" size="sm" disabled>
            <Upload />
            Uploads not configured
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {CLOUDINARY_CLOUD_NAME
          ? "PDF or image, up to 16MB."
          : "Set NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME to enable document uploads."}
      </p>
    </section>
  )
}

function DeleteProject({
  project,
  onDeleted,
}: {
  project: CustomerProject
  onDeleted: (id: string) => void
}) {
  async function onDelete() {
    const res = await removeProject({ id: project.id })
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    toast.success("Project deleted.")
    onDeleted(project.id)
  }

  return (
    <div className="flex items-center gap-2 border-t pt-4">
      <ConfirmButton
        question="Delete this project permanently?"
        confirmLabel="Delete"
        onConfirm={onDelete}
      >
        <Trash2 /> Delete project
      </ConfirmButton>
    </div>
  )
}

/** Apply an action result: toast on error, push the updated project on success. */
function handle(
  res: ActionResult<CustomerProject>,
  onChange: (project: CustomerProject) => void,
  successMessage: string,
): boolean {
  if (!res.ok) {
    toast.error(res.error)
    return false
  }
  onChange(res.data)
  if (res.warning) {
    toast.warning(res.warning)
  } else {
    toast.success(successMessage)
  }
  return true
}
