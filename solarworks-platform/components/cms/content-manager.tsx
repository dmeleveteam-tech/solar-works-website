"use client"

import * as React from "react"
import { Eye, EyeOff, Loader2, Pencil, Plus, Star, Trash2, X } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import {
  AUDIENCES,
  SYSTEM_TYPES,
  FAQ_CATEGORIES,
  CONTENT_TYPE_LABEL,
  type ContentType,
  type ProjectItem,
  type TestimonialItem,
  type FaqItem,
  type Audience,
  type SystemType,
  type FaqCategory,
} from "@/lib/content-shared"
import {
  createProject,
  updateProject,
  setProjectPublished,
  deleteProject,
  createTestimonial,
  updateTestimonial,
  setTestimonialPublished,
  deleteTestimonial,
  createFaq,
  updateFaq,
  setFaqPublished,
  deleteFaq,
  type ActionResult,
} from "@/app/cms/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { ImageField } from "@/components/cms/image-field"

// --- shared field primitives ------------------------------------------------

const controlClass = cn(
  "h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm shadow-xs outline-none",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
  "disabled:pointer-events-none disabled:opacity-50",
)
const textareaClass = cn(controlClass, "h-auto min-h-20 py-2 leading-relaxed")

function Field({
  label,
  htmlFor,
  className,
  children,
}: {
  label: string
  htmlFor?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  )
}

function Select({
  options,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { options: readonly string[] }) {
  return (
    <select className={controlClass} {...props}>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  )
}

function CheckboxField({
  label,
  name,
  defaultChecked,
}: {
  label: string
  name: string
  defaultChecked?: boolean
}) {
  return (
    <label className="flex items-center gap-2 text-sm font-medium select-none">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="size-4 accent-primary"
      />
      {label}
    </label>
  )
}

/** Yellow "Published" / muted "Draft" pill. */
function PublishedBadge({ published }: { published: boolean }) {
  return (
    <span
      className={cn(
        "rounded-full px-2 py-0.5 text-xs font-medium",
        published
          ? "bg-primary/10 text-primary-strong"
          : "bg-muted text-muted-foreground",
      )}
    >
      {published ? "Published" : "Draft"}
    </span>
  )
}

/** Row action buttons shared by every list (publish toggle, edit, delete). */
function RowActions({
  published,
  busy,
  onTogglePublish,
  onEdit,
  onDelete,
}: {
  published: boolean
  busy: boolean
  onTogglePublish: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex items-center gap-1">
      {busy ? <Loader2 className="mr-1 size-4 animate-spin text-muted-foreground" /> : null}
      <Button
        variant="ghost"
        size="sm"
        disabled={busy}
        onClick={onTogglePublish}
        title={published ? "Unpublish" : "Publish"}
      >
        {published ? <EyeOff /> : <Eye />}
        <span className="hidden sm:inline">{published ? "Unpublish" : "Publish"}</span>
      </Button>
      <Button variant="ghost" size="sm" disabled={busy} onClick={onEdit} title="Edit">
        <Pencil />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        disabled={busy}
        onClick={onDelete}
        title="Delete"
        className="text-destructive hover:text-destructive"
      >
        <Trash2 />
      </Button>
    </div>
  )
}

/** Helper: read a trimmed string from FormData. */
function str(fd: FormData, key: string): string {
  return String(fd.get(key) ?? "").trim()
}
function bool(fd: FormData, key: string): boolean {
  return fd.get(key) != null
}

// --- generic CRUD list hook -------------------------------------------------
//
// Each content type shares the same lifecycle (optimistic add/replace/remove,
// publish toggle, delete-with-confirm). The differences are only in the form,
// so the list mechanics live here and the forms are written per type.

type WithIdPublished = { id: string; published: boolean }

function useCrud<T extends WithIdPublished>(initial: T[], noun: string) {
  const [items, setItems] = React.useState<T[]>(initial)
  const [editing, setEditing] = React.useState<T | "new" | null>(null)
  const [busyId, setBusyId] = React.useState<string | null>(null)

  const onSaved = React.useCallback(
    (res: ActionResult<T>, wasNew: boolean) => {
      if (!res.ok) {
        toast.error(res.error)
        return false
      }
      const saved = res.data
      setItems((prev) =>
        wasNew ? [saved, ...prev] : prev.map((i) => (i.id === saved.id ? saved : i)),
      )
      toast.success(wasNew ? `${noun} added` : `${noun} updated`)
      setEditing(null)
      return true
    },
    [noun],
  )

  const togglePublish = React.useCallback(
    async (
      item: T,
      action: (input: { id: string; published: boolean }) => Promise<ActionResult<T>>,
    ) => {
      setBusyId(item.id)
      const res = await action({ id: item.id, published: !item.published })
      setBusyId(null)
      if (!res.ok) return toast.error(res.error)
      setItems((prev) => prev.map((i) => (i.id === res.data.id ? res.data : i)))
    },
    [],
  )

  const remove = React.useCallback(
    async (item: T, label: string, action: (i: { id: string }) => Promise<ActionResult>) => {
      if (!window.confirm(`Delete ${label}? This cannot be undone.`)) return
      setBusyId(item.id)
      const res = await action({ id: item.id })
      setBusyId(null)
      if (!res.ok) return toast.error(res.error)
      setItems((prev) => prev.filter((i) => i.id !== item.id))
      toast.success(`${noun} deleted`)
    },
    [noun],
  )

  return { items, editing, setEditing, busyId, onSaved, togglePublish, remove }
}

function SectionHeader({
  title,
  description,
  onAdd,
  adding,
}: {
  title: string
  description: string
  onAdd: () => void
  adding: boolean
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <h2 className="font-heading text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Button onClick={onAdd} disabled={adding}>
        <Plus /> Add
      </Button>
    </div>
  )
}

function FormShell({
  title,
  onSubmit,
  onCancel,
  saving,
  children,
}: {
  title: string
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  onCancel: () => void
  saving: boolean
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">{title}</h3>
            <Button type="button" variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
              <X /> Cancel
            </Button>
          </div>
          {children}
          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : null}
              Save
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="py-12 text-center text-sm text-muted-foreground">
        {children}
      </CardContent>
    </Card>
  )
}

// --- projects ---------------------------------------------------------------

function ProjectsManager({ initial }: { initial: ProjectItem[] }) {
  const crud = useCrud<ProjectItem>(initial, "Project")
  const [saving, setSaving] = React.useState(false)
  const editing = crud.editing
  const current = editing && editing !== "new" ? editing : null

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const input = {
      title: str(fd, "title"),
      slug: str(fd, "slug"),
      category: str(fd, "category") as Audience,
      systemType: str(fd, "systemType") as SystemType,
      capacityKw: str(fd, "capacityKw"),
      batteryKwh: str(fd, "batteryKwh") || null,
      location: str(fd, "location"),
      image: str(fd, "image"),
      scope: str(fd, "scope"),
      outcome: str(fd, "outcome"),
      featured: bool(fd, "featured"),
      published: bool(fd, "published"),
      sortOrder: str(fd, "sortOrder") || 0,
    }
    setSaving(true)
    const res = current
      ? await updateProject({ id: current.id, ...input })
      : await createProject(input)
    setSaving(false)
    crud.onSaved(res, !current)
  }

  return (
    <div className="grid gap-4">
      <SectionHeader
        title="Projects"
        description="Installations shown on Our Work; featured ones surface on the Home page."
        onAdd={() => crud.setEditing("new")}
        adding={editing === "new"}
      />

      {editing ? (
        <FormShell
          key={current?.id ?? "new"}
          title={current ? "Edit project" : "New project"}
          onSubmit={onSubmit}
          onCancel={() => crud.setEditing(null)}
          saving={saving}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title" htmlFor="p-title">
              <Input id="p-title" name="title" defaultValue={current?.title} required />
            </Field>
            <Field label="Slug" htmlFor="p-slug">
              <Input
                id="p-slug"
                name="slug"
                defaultValue={current?.slug}
                placeholder="tagaytay-hybrid-home"
                required
              />
            </Field>
            <Field label="Category" htmlFor="p-category">
              <Select id="p-category" name="category" defaultValue={current?.category ?? AUDIENCES[0]} options={AUDIENCES} />
            </Field>
            <Field label="System type" htmlFor="p-system">
              <Select id="p-system" name="systemType" defaultValue={current?.systemType ?? SYSTEM_TYPES[0]} options={SYSTEM_TYPES} />
            </Field>
            <Field label="Capacity (kW)" htmlFor="p-kw">
              <Input id="p-kw" name="capacityKw" type="number" step="0.1" min="0" defaultValue={current?.capacityKw} required />
            </Field>
            <Field label="Battery (kWh) — optional" htmlFor="p-batt">
              <Input id="p-batt" name="batteryKwh" type="number" step="0.1" min="0" defaultValue={current?.batteryKwh ?? ""} />
            </Field>
            <Field label="Location" htmlFor="p-loc">
              <Input id="p-loc" name="location" defaultValue={current?.location} required />
            </Field>
            <ImageField label="Project image" name="image" defaultValue={current?.image} required />
            <Field label="Scope" htmlFor="p-scope" className="sm:col-span-2">
              <textarea id="p-scope" name="scope" defaultValue={current?.scope} className={textareaClass} required />
            </Field>
            <Field label="Outcome" htmlFor="p-out" className="sm:col-span-2">
              <textarea id="p-out" name="outcome" defaultValue={current?.outcome} className={textareaClass} required />
            </Field>
            <Field label="Sort order" htmlFor="p-sort">
              <Input id="p-sort" name="sortOrder" type="number" min="0" defaultValue={current?.sortOrder ?? 0} />
            </Field>
            <div className="flex items-end gap-6">
              <CheckboxField label="Featured" name="featured" defaultChecked={current?.featured} />
              <CheckboxField label="Published" name="published" defaultChecked={current?.published} />
            </div>
          </div>
        </FormShell>
      ) : null}

      {crud.items.length === 0 ? (
        <EmptyState>No projects yet. Add your first installation above.</EmptyState>
      ) : (
        <Card>
          <CardContent className="divide-y p-0">
            {crud.items.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 font-medium">
                    <span className="truncate">{p.title}</span>
                    {p.featured ? <Star className="size-3.5 fill-primary text-primary" /> : null}
                    <PublishedBadge published={p.published} />
                  </div>
                  <div className="truncate text-sm text-muted-foreground">
                    {p.category} · {p.systemType} · {p.capacityKw} kW
                    {p.batteryKwh ? ` + ${p.batteryKwh} kWh` : ""} · {p.location}
                  </div>
                </div>
                <RowActions
                  published={p.published}
                  busy={crud.busyId === p.id}
                  onTogglePublish={() => crud.togglePublish(p, setProjectPublished)}
                  onEdit={() => crud.setEditing(p)}
                  onDelete={() => crud.remove(p, `the project “${p.title}”`, deleteProject)}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// --- testimonials -----------------------------------------------------------

function TestimonialsManager({ initial }: { initial: TestimonialItem[] }) {
  const crud = useCrud<TestimonialItem>(initial, "Testimonial")
  const [saving, setSaving] = React.useState(false)
  const editing = crud.editing
  const current = editing && editing !== "new" ? editing : null
  const [kind, setKind] = React.useState<TestimonialItem["kind"]>("video")

  // Sync the kind selector whenever the editor opens.
  React.useEffect(() => {
    if (editing) setKind(current?.kind ?? "video")
  }, [editing, current])

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const input = {
      kind,
      name: str(fd, "name"),
      location: str(fd, "location"),
      audience: str(fd, "audience") as Audience,
      systemType: str(fd, "systemType") as SystemType,
      headline: str(fd, "headline"),
      summary: str(fd, "summary"),
      thumbnail: str(fd, "thumbnail"),
      videoId: str(fd, "videoId"),
      quote: str(fd, "quote"),
      photo: str(fd, "photo"),
      published: bool(fd, "published"),
      sortOrder: str(fd, "sortOrder") || 0,
    }
    setSaving(true)
    const res = current
      ? await updateTestimonial({ id: current.id, ...input })
      : await createTestimonial(input)
    setSaving(false)
    crud.onSaved(res, !current)
  }

  return (
    <div className="grid gap-4">
      <SectionHeader
        title="Testimonials"
        description="Video and written customer proof shown on Home and Customer Stories."
        onAdd={() => crud.setEditing("new")}
        adding={editing === "new"}
      />

      {editing ? (
        <FormShell
          key={current?.id ?? "new"}
          title={current ? "Edit testimonial" : "New testimonial"}
          onSubmit={onSubmit}
          onCancel={() => crud.setEditing(null)}
          saving={saving}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Type" htmlFor="t-kind">
              <select
                id="t-kind"
                value={kind}
                onChange={(e) => setKind(e.target.value as TestimonialItem["kind"])}
                className={controlClass}
              >
                <option value="video">Video</option>
                <option value="written">Written</option>
              </select>
            </Field>
            <Field label="Name" htmlFor="t-name">
              <Input id="t-name" name="name" defaultValue={current?.name} required />
            </Field>
            <Field label="Location — optional" htmlFor="t-loc">
              <Input id="t-loc" name="location" defaultValue={current?.location ?? ""} />
            </Field>
            <Field label="Audience" htmlFor="t-aud">
              <Select id="t-aud" name="audience" defaultValue={current?.audience ?? AUDIENCES[0]} options={AUDIENCES} />
            </Field>
            <Field label="System type" htmlFor="t-sys">
              <Select id="t-sys" name="systemType" defaultValue={current?.systemType ?? SYSTEM_TYPES[0]} options={SYSTEM_TYPES} />
            </Field>

            {kind === "video" ? (
              <>
                <Field label="Headline" htmlFor="t-head" className="sm:col-span-2">
                  <Input id="t-head" name="headline" defaultValue={current?.headline ?? ""} placeholder="“No more dreading the brownouts.”" />
                </Field>
                <Field label="Summary" htmlFor="t-sum" className="sm:col-span-2">
                  <textarea id="t-sum" name="summary" defaultValue={current?.summary ?? ""} className={textareaClass} />
                </Field>
                <ImageField label="Thumbnail" name="thumbnail" defaultValue={current?.thumbnail} required />
                <Field label="Video ID / embed" htmlFor="t-vid">
                  <Input id="t-vid" name="videoId" defaultValue={current?.videoId ?? ""} placeholder="YouTube/Vimeo id" />
                </Field>
              </>
            ) : (
              <>
                <Field label="Quote" htmlFor="t-quote" className="sm:col-span-2">
                  <textarea id="t-quote" name="quote" defaultValue={current?.quote ?? ""} className={textareaClass} />
                </Field>
                <div className="sm:col-span-2">
                  <ImageField label="Client photo — optional" name="photo" defaultValue={current?.photo} />
                </div>
              </>
            )}

            <Field label="Sort order" htmlFor="t-sort">
              <Input id="t-sort" name="sortOrder" type="number" min="0" defaultValue={current?.sortOrder ?? 0} />
            </Field>
            <div className="flex items-end">
              <CheckboxField label="Published" name="published" defaultChecked={current?.published} />
            </div>
          </div>
        </FormShell>
      ) : null}

      {crud.items.length === 0 ? (
        <EmptyState>No testimonials yet. Add video or written proof above.</EmptyState>
      ) : (
        <Card>
          <CardContent className="divide-y p-0">
            {crud.items.map((t) => (
              <div key={t.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 font-medium">
                    <span className="truncate">{t.name}</span>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize text-muted-foreground">
                      {t.kind}
                    </span>
                    <PublishedBadge published={t.published} />
                  </div>
                  <div className="truncate text-sm text-muted-foreground">
                    {t.kind === "video" ? t.headline : t.quote}
                  </div>
                </div>
                <RowActions
                  published={t.published}
                  busy={crud.busyId === t.id}
                  onTogglePublish={() => crud.togglePublish(t, setTestimonialPublished)}
                  onEdit={() => crud.setEditing(t)}
                  onDelete={() => crud.remove(t, `the testimonial from ${t.name}`, deleteTestimonial)}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// --- faqs -------------------------------------------------------------------

function FaqsManager({ initial }: { initial: FaqItem[] }) {
  const crud = useCrud<FaqItem>(initial, "FAQ")
  const [saving, setSaving] = React.useState(false)
  const editing = crud.editing
  const current = editing && editing !== "new" ? editing : null

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const input = {
      question: str(fd, "question"),
      answer: str(fd, "answer"),
      category: str(fd, "category") as FaqCategory,
      published: bool(fd, "published"),
      sortOrder: str(fd, "sortOrder") || 0,
    }
    setSaving(true)
    const res = current
      ? await updateFaq({ id: current.id, ...input })
      : await createFaq(input)
    setSaving(false)
    crud.onSaved(res, !current)
  }

  return (
    <div className="grid gap-4">
      <SectionHeader
        title="FAQs"
        description="Questions shown in the Learning Center and Solutions accordions."
        onAdd={() => crud.setEditing("new")}
        adding={editing === "new"}
      />

      {editing ? (
        <FormShell
          key={current?.id ?? "new"}
          title={current ? "Edit FAQ" : "New FAQ"}
          onSubmit={onSubmit}
          onCancel={() => crud.setEditing(null)}
          saving={saving}
        >
          <div className="grid gap-4">
            <Field label="Question" htmlFor="f-q">
              <Input id="f-q" name="question" defaultValue={current?.question} required />
            </Field>
            <Field label="Answer" htmlFor="f-a">
              <textarea id="f-a" name="answer" defaultValue={current?.answer} className={textareaClass} required />
            </Field>
            <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto] sm:items-end">
              <Field label="Category" htmlFor="f-cat">
                <Select id="f-cat" name="category" defaultValue={current?.category ?? FAQ_CATEGORIES[0]} options={FAQ_CATEGORIES} />
              </Field>
              <Field label="Sort order" htmlFor="f-sort">
                <Input id="f-sort" name="sortOrder" type="number" min="0" defaultValue={current?.sortOrder ?? 0} className="w-28" />
              </Field>
              <div className="pb-2">
                <CheckboxField label="Published" name="published" defaultChecked={current?.published} />
              </div>
            </div>
          </div>
        </FormShell>
      ) : null}

      {crud.items.length === 0 ? (
        <EmptyState>No FAQs yet. Add your first question above.</EmptyState>
      ) : (
        <Card>
          <CardContent className="divide-y p-0">
            {crud.items.map((f) => (
              <div key={f.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 font-medium">
                    <span className="truncate">{f.question}</span>
                    <PublishedBadge published={f.published} />
                  </div>
                  <div className="truncate text-sm text-muted-foreground">
                    {f.category} · {f.answer}
                  </div>
                </div>
                <RowActions
                  published={f.published}
                  busy={crud.busyId === f.id}
                  onTogglePublish={() => crud.togglePublish(f, setFaqPublished)}
                  onEdit={() => crud.setEditing(f)}
                  onDelete={() => crud.remove(f, "this FAQ", deleteFaq)}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// --- tabbed shell -----------------------------------------------------------

export function ContentManager({
  projects,
  testimonials,
  faqs,
}: {
  projects: ProjectItem[]
  testimonials: TestimonialItem[]
  faqs: FaqItem[]
}) {
  const [tab, setTab] = React.useState<ContentType>("projects")
  const counts: Record<ContentType, number> = {
    projects: projects.length,
    testimonials: testimonials.length,
    faqs: faqs.length,
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-1">
        {(Object.keys(CONTENT_TYPE_LABEL) as ContentType[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm transition-colors",
              tab === t
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {CONTENT_TYPE_LABEL[t]}
            <span className="ml-1.5 text-xs opacity-70">{counts[t]}</span>
          </button>
        ))}
      </div>

      {tab === "projects" ? <ProjectsManager initial={projects} /> : null}
      {tab === "testimonials" ? <TestimonialsManager initial={testimonials} /> : null}
      {tab === "faqs" ? <FaqsManager initial={faqs} /> : null}
    </div>
  )
}
