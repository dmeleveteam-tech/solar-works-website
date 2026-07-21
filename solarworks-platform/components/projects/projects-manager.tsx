"use client"

import * as React from "react"
import { CldUploadWidget } from "next-cloudinary"
import {
  ChevronDown,
  ExternalLink,
  FileText,
  Loader2,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { CLOUDINARY_SIGN_ENDPOINT, CLOUDINARY_UPLOAD_OPTIONS } from "@/lib/cloudinary-upload"
import {
  PROJECT_STAGES,
  STAGE_LABEL,
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
import type { LinkableCustomer } from "@/lib/customer-projects"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"

const controlClass = cn(
  "h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm shadow-xs outline-none",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
  "disabled:pointer-events-none disabled:opacity-50",
)

export function ProjectsManager({
  initialProjects,
  customers,
  canDelete,
}: {
  initialProjects: CustomerProject[]
  customers: LinkableCustomer[]
  canDelete: boolean
}) {
  const [projects, setProjects] = React.useState(initialProjects)
  const [adding, setAdding] = React.useState(false)

  function upsert(updated: CustomerProject) {
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {projects.length} customer {projects.length === 1 ? "project" : "projects"}
        </p>
        <Button size="sm" onClick={() => setAdding((v) => !v)}>
          {adding ? <X /> : <Plus />}
          {adding ? "Cancel" : "New project"}
        </Button>
      </div>

      {adding ? (
        <CreateProjectForm
          customers={customers}
          onCreated={(project) => {
            setProjects((prev) => [project, ...prev])
            setAdding(false)
          }}
        />
      ) : null}

      {projects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No customer projects yet. Create one to give a customer portal access.
          </CardContent>
        </Card>
      ) : (
        projects.map((project) => (
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

// --- create -----------------------------------------------------------------

function CreateProjectForm({
  customers,
  onCreated,
}: {
  customers: LinkableCustomer[]
  onCreated: (project: CustomerProject) => void
}) {
  const [mode, setMode] = React.useState<"existing" | "new">(
    customers.length > 0 ? "existing" : "new",
  )
  const [saving, setSaving] = React.useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const displayName = String(fd.get("displayName") ?? "").trim()
    const siteAddress = String(fd.get("siteAddress") ?? "").trim()

    const base = { displayName, siteAddress }
    const input =
      mode === "existing"
        ? { ...base, mode: "existing" as const, customerUserId: String(fd.get("customerUserId") ?? "") }
        : {
            ...base,
            mode: "new" as const,
            name: String(fd.get("name") ?? "").trim(),
            email: String(fd.get("email") ?? "").trim(),
            password: String(fd.get("password") ?? ""),
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
    <Card>
      <CardContent className="grid gap-4 py-5">
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={mode === "existing" ? "default" : "outline"}
              onClick={() => setMode("existing")}
              disabled={customers.length === 0}
            >
              Existing customer
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === "new" ? "default" : "outline"}
              onClick={() => setMode("new")}
            >
              New customer account
            </Button>
          </div>

          {mode === "existing" ? (
            <div className="grid gap-1.5">
              <Label htmlFor="customerUserId">Customer</Label>
              <select id="customerUserId" name="customerUserId" className={controlClass} required>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name ? `${c.name} — ${c.email}` : c.email}
                  </option>
                ))}
              </select>
            </div>
          ) : (
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
                <Label htmlFor="password">Temporary password</Label>
                <Input id="password" name="password" type="text" required minLength={8} maxLength={200} />
              </div>
            </div>
          )}

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

          {mode === "new" ? (
            <p className="text-xs text-muted-foreground">
              This creates a customer login. Share the email and temporary password with
              them; they can sign in at the portal.
            </p>
          ) : null}

          <div>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : <Plus />}
              Create project
            </Button>
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

  return (
    <Card>
      <CardContent className="py-4">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-3 text-left"
          aria-expanded={open}
        >
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{project.displayName}</p>
            <p className="truncate text-sm text-muted-foreground">
              {project.customerName ? `${project.customerName} · ` : ""}
              {project.customerEmail}
            </p>
          </div>
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-foreground">
            {STAGE_LABEL[project.stage]}
          </span>
          <ChevronDown
            className={cn("size-4 shrink-0 transition-transform", open && "rotate-180")}
          />
        </button>

        {open ? (
          <div className="mt-4 grid gap-5 border-t pt-4">
            <StageEditor project={project} onChange={onChange} />
            <DocumentsEditor project={project} onChange={onChange} />
            {canDelete ? (
              <DeleteProject project={project} onDeleted={onDeleted} />
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
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
  const [saving, setSaving] = React.useState(false)

  async function onSave() {
    setSaving(true)
    const res = await updateProjectStage({ id: project.id, stage, stageNote: note })
    setSaving(false)
    handle(res, onChange, "Stage updated.")
  }

  return (
    <div className="grid gap-3">
      <p className="text-sm font-medium">Status</p>
      <div className="grid gap-3 sm:grid-cols-[12rem_1fr]">
        <div className="grid gap-1.5">
          <Label htmlFor={`stage-${project.id}`}>Stage</Label>
          <select
            id={`stage-${project.id}`}
            className={controlClass}
            value={stage}
            onChange={(e) => setStage(e.target.value as ProjectStage)}
          >
            {PROJECT_STAGES.map((s) => (
              <option key={s} value={s}>
                {STAGE_LABEL[s]}
              </option>
            ))}
          </select>
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
      <div>
        <Button size="sm" onClick={onSave} disabled={saving}>
          {saving ? <Loader2 className="animate-spin" /> : null}
          Save status
        </Button>
      </div>
    </div>
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
    <div className="grid gap-3">
      <p className="text-sm font-medium">Documents</p>

      {project.documents.length > 0 ? (
        <ul className="grid gap-2">
          {project.documents.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm"
            >
              <FileText className="size-4 shrink-0 text-muted-foreground" />
              <a
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 flex-1 truncate hover:underline"
              >
                {doc.label}
              </a>
              <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
              <Button
                type="button"
                variant="ghost"
                size="sm"
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
      </div>
      <p className="text-xs text-muted-foreground">PDF or image, up to 16MB.</p>
    </div>
  )
}

function DeleteProject({
  project,
  onDeleted,
}: {
  project: CustomerProject
  onDeleted: (id: string) => void
}) {
  const [confirming, setConfirming] = React.useState(false)
  const [busy, setBusy] = React.useState(false)

  async function onDelete() {
    setBusy(true)
    const res = await removeProject({ id: project.id })
    setBusy(false)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    toast.success("Project deleted.")
    onDeleted(project.id)
  }

  return (
    <div className="flex items-center gap-2 border-t pt-4">
      {confirming ? (
        <>
          <span className="text-sm text-muted-foreground">Delete this project permanently?</span>
          <Button size="sm" variant="destructive" onClick={onDelete} disabled={busy}>
            {busy ? <Loader2 className="animate-spin" /> : <Trash2 />}
            Confirm delete
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirming(false)} disabled={busy}>
            Cancel
          </Button>
        </>
      ) : (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setConfirming(true)}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 /> Delete project
        </Button>
      )}
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
  toast.success(successMessage)
  return true
}
