"use client"

import * as React from "react"
import {
  Eye,
  EyeOff,
  GripVertical,
  HelpCircle,
  Images,
  Loader2,
  MessageSquareQuote,
  Pencil,
  Plus,
  Star,
  Trash2,
  X,
} from "lucide-react"
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
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
  reorderProjects,
  reorderTestimonials,
  reorderFaqs,
  type ActionResult,
} from "@/app/cms/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select } from "@/components/ui/select"
import { ConfirmButton } from "@/components/ui/confirm-button"
import { EmptyState } from "@/components/ui/empty-state"
import { ImageField } from "@/components/cms/image-field"
import { VideoField } from "@/components/cms/video-field"
import { ContentPreview, type PreviewState } from "@/components/cms/content-preview"

// --- shared field primitives ------------------------------------------------

// Matches `Input`'s box so a textarea sitting next to one in the same grid
// agrees on radius, border and focus ring.
const textareaClass = cn(
  "w-full min-h-20 rounded-md border border-input bg-transparent px-2.5 py-2 text-sm leading-relaxed shadow-e1 outline-none transition-[color,box-shadow,border-color]",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
  "hover:border-ring/60 disabled:pointer-events-none disabled:opacity-50",
  "dark:bg-input/30",
)

/** Per-field server validation messages, keyed by field name. */
const FieldErrorsContext = React.createContext<Record<string, string>>({})

/** Small red message shown under an invalid field. */
function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-xs font-medium text-destructive">{message}</p>
}

function Field({
  label,
  htmlFor,
  name,
  className,
  children,
}: {
  label: string
  htmlFor?: string
  /** Field name; when set, an inline error for it is shown from context. */
  name?: string
  className?: string
  children: React.ReactNode
}) {
  const errors = React.useContext(FieldErrorsContext)
  return (
    <div className={cn("grid gap-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {name ? <FieldError message={errors[name]} /> : null}
    </div>
  )
}

/** Shared `Select` fed from a fixed vocabulary list. */
function OptionSelect({
  options,
  ...props
}: React.ComponentProps<typeof Select> & { options: readonly string[] }) {
  return (
    <Select {...props}>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </Select>
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

/** Live-on-the-public-site state. Draft stays quiet; published is the signal. */
function PublishedBadge({ published }: { published: boolean }) {
  return published ? (
    <Badge tone="success">Published</Badge>
  ) : (
    <Badge tone="outline">Draft</Badge>
  )
}

/** Row action buttons shared by every list (publish toggle, edit, delete). */
function RowActions({
  published,
  busy,
  deleteQuestion,
  onTogglePublish,
  onEdit,
  onDelete,
}: {
  published: boolean
  busy: boolean
  /** Shown inline on the confirm step, so the row says what it is about to delete. */
  deleteQuestion: string
  onTogglePublish: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex items-center gap-1">
      {busy ? (
        <Loader2 className="mr-1 size-4 animate-spin text-muted-foreground" />
      ) : null}
      <Button
        variant="ghost"
        size="sm"
        disabled={busy}
        onClick={onTogglePublish}
        aria-label={published ? "Unpublish" : "Publish"}
      >
        {published ? <EyeOff /> : <Eye />}
        <span className="hidden sm:inline">
          {published ? "Unpublish" : "Publish"}
        </span>
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={busy}
        onClick={onEdit}
        aria-label="Edit"
      >
        <Pencil />
      </Button>
      <ConfirmButton
        question={deleteQuestion}
        confirmLabel="Delete"
        disabled={busy}
        onConfirm={onDelete}
        className="px-2"
      >
        <Trash2 />
        <span className="sr-only">Delete</span>
      </ConfirmButton>
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
  const [editing, setEditingState] = React.useState<T | "new" | null>(null)
  const [busyId, setBusyId] = React.useState<string | null>(null)
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  // Opening, switching, or closing the editor always clears stale field errors.
  const setEditing = React.useCallback((next: T | "new" | null) => {
    setErrors({})
    setEditingState(next)
  }, [])

  const onSaved = React.useCallback(
    (res: ActionResult<T>, wasNew: boolean) => {
      if (!res.ok) {
        setErrors(res.fieldErrors ?? {})
        toast.error(res.error)
        return false
      }
      const saved = res.data
      setItems((prev) =>
        wasNew ? [saved, ...prev] : prev.map((i) => (i.id === saved.id ? saved : i)),
      )
      toast.success(wasNew ? `${noun} added` : `${noun} updated`)
      setEditingState(null)
      setErrors({})
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

  // Confirmation is handled by the row's `ConfirmButton`, so by the time this
  // runs the deletion is already agreed to.
  const remove = React.useCallback(
    async (item: T, action: (i: { id: string }) => Promise<ActionResult>) => {
      setBusyId(item.id)
      const res = await action({ id: item.id })
      setBusyId(null)
      if (!res.ok) return toast.error(res.error)
      setItems((prev) => prev.filter((i) => i.id !== item.id))
      toast.success(`${noun} deleted`)
    },
    [noun],
  )

  // Optimistically apply a drag reorder, reverting if the server rejects it.
  const reorder = React.useCallback(
    async (orderedIds: string[], action: (i: { ids: string[] }) => Promise<ActionResult>) => {
      let prev: T[] = []
      setItems((cur) => {
        prev = cur
        const byId = new Map(cur.map((i) => [i.id, i]))
        return orderedIds.map((id) => byId.get(id)).filter((i): i is T => i != null)
      })
      const res = await action({ ids: orderedIds })
      if (!res.ok) {
        setItems(prev)
        toast.error(res.error)
      }
    },
    [],
  )

  return { items, editing, setEditing, busyId, errors, onSaved, togglePublish, remove, reorder }
}

function SectionHeader({
  label,
  title,
  description,
  addLabel,
  onAdd,
  adding,
}: {
  label: string
  title: string
  description: string
  addLabel: string
  onAdd: () => void
  adding: boolean
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <p className="section-label mb-2">{label}</p>
        <h2 className="font-heading text-lg font-semibold">{title}</h2>
        <p className="mt-1 max-w-[62ch] text-sm text-pretty text-muted-foreground">
          {description}
        </p>
      </div>
      <Button onClick={onAdd} disabled={adding} className="shrink-0">
        <Plus /> {addLabel}
      </Button>
    </div>
  )
}

function FormShell({
  title,
  onSubmit,
  onCancel,
  onPreview,
  saving,
  errors,
  children,
}: {
  title: string
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void
  onCancel: () => void
  /** Opens a public-site preview built from the form's current values. */
  onPreview: (form: HTMLFormElement) => void
  saving: boolean
  errors: Record<string, string>
  children: React.ReactNode
}) {
  const errorCount = Object.keys(errors).length

  return (
    // The editor is the one surface on the page that is "in progress", so it
    // sits a step above the list it edits and carries a brand-tinted top rail.
    <Card className="border-t-2 border-t-primary shadow-e2">
      <CardContent className="px-0">
        <FieldErrorsContext.Provider value={errors}>
          <form onSubmit={onSubmit} className="grid gap-5">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b px-(--card-spacing) pb-4">
              <div className="flex min-w-0 items-center gap-2">
                <h3 className="font-heading font-semibold">{title}</h3>
                {errorCount > 0 ? (
                  <Badge tone="danger" size="sm">
                    {errorCount} {errorCount === 1 ? "field needs" : "fields need"} a fix
                  </Badge>
                ) : null}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onCancel}
                disabled={saving}
              >
                <X /> Cancel
              </Button>
            </div>
            <div className="px-(--card-spacing)">{children}</div>
            <div className="flex justify-end gap-2 border-t px-(--card-spacing) pt-4">
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={(e) => {
                  if (e.currentTarget.form) onPreview(e.currentTarget.form)
                }}
              >
                <Eye /> Preview
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="animate-spin" /> : null}
                Save
              </Button>
            </div>
          </form>
        </FieldErrorsContext.Provider>
      </CardContent>
    </Card>
  )
}

/** Groups related fields inside the editor so a long form reads as sections. */
function FieldGroup({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div role="group" aria-label={label} className={cn("grid gap-4", className)}>
      <p className="section-label">{label}</p>
      {children}
    </div>
  )
}

// --- drag-to-reorder --------------------------------------------------------
//
// Rows are draggable by their grip handle; dropping persists the new order via
// the type's reorder action. Both the editor and the public site sort by
// sortOrder, so the order set here is what visitors see.

/** Honor `prefers-reduced-motion` without a setState-in-effect lint violation. */
function usePrefersReducedMotion(): boolean {
  return React.useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia("(prefers-reduced-motion: reduce)")
      mql.addEventListener("change", onChange)
      return () => mql.removeEventListener("change", onChange)
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  )
}

function SortableRow<T extends { id: string }>({
  item,
  renderRow,
  reduceMotion,
}: {
  item: T
  renderRow: (item: T, handle: React.ReactNode) => React.ReactNode
  reduceMotion: boolean
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: reduceMotion ? undefined : transition,
  }

  const handle = (
    // Grip is a real button so keyboard reordering (dnd-kit's KeyboardSensor)
    // keeps working; the ring and grab cursor make that reachability visible.
    <button
      type="button"
      aria-label="Drag to reorder"
      className={cn(
        "-ml-1 flex size-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-md",
        "text-muted-foreground/70 transition-colors",
        "hover:bg-muted hover:text-foreground active:cursor-grabbing",
        "group-hover/row:text-foreground",
        "focus-visible:bg-muted focus-visible:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
      )}
      {...attributes}
      {...listeners}
    >
      <GripVertical className="size-4" />
    </button>
  )

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        // Hover tint lives on the inner `.data-row`; this wrapper only carries
        // the drag transform and the group scope for the grip handle.
        "group/row bg-card",
        isDragging && "relative z-10 rounded-md opacity-90 shadow-e2",
      )}
    >
      {renderRow(item, handle)}
    </div>
  )
}

function SortableList<T extends { id: string }>({
  items,
  onReorder,
  renderRow,
}: {
  items: T[]
  onReorder: (orderedIds: string[]) => void
  renderRow: (item: T, handle: React.ReactNode) => React.ReactNode
}) {
  const reduceMotion = usePrefersReducedMotion()
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex((i) => i.id === active.id)
    const newIndex = items.findIndex((i) => i.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return
    onReorder(arrayMove(items, oldIndex, newIndex).map((i) => i.id))
  }

  return (
    <Card className="py-0">
      <CardContent className="divide-y divide-border/60 px-0">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext
            items={items.map((i) => i.id)}
            strategy={verticalListSortingStrategy}
          >
            {items.map((item) => (
              <SortableRow
                key={item.id}
                item={item}
                renderRow={renderRow}
                reduceMotion={reduceMotion}
              />
            ))}
          </SortableContext>
        </DndContext>
      </CardContent>
    </Card>
  )
}

// --- projects ---------------------------------------------------------------

function ProjectsManager({ initial }: { initial: ProjectItem[] }) {
  const crud = useCrud<ProjectItem>(initial, "Project")
  const [saving, setSaving] = React.useState(false)
  const [preview, setPreview] = React.useState<PreviewState | null>(null)
  const editing = crud.editing
  const current = editing && editing !== "new" ? editing : null

  function onPreview(form: HTMLFormElement) {
    const fd = new FormData(form)
    setPreview({
      kind: "project",
      data: {
        title: str(fd, "title"),
        category: str(fd, "category"),
        systemType: str(fd, "systemType"),
        capacityKw: str(fd, "capacityKw"),
        batteryKwh: str(fd, "batteryKwh"),
        location: str(fd, "location"),
        scope: str(fd, "scope"),
        outcome: str(fd, "outcome"),
        image: str(fd, "image"),
      },
    })
  }

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
      // Ordering is managed by drag-and-drop, not this form; preserve it on edit.
      sortOrder: current?.sortOrder ?? 0,
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
        label="Our work"
        title="Projects"
        description="Installations shown on Our Work; featured ones surface on the Home page."
        addLabel="Add project"
        onAdd={() => crud.setEditing("new")}
        adding={editing === "new"}
      />

      {editing ? (
        <FormShell
          key={current?.id ?? "new"}
          title={current ? "Edit project" : "New project"}
          onSubmit={onSubmit}
          onCancel={() => crud.setEditing(null)}
          onPreview={onPreview}
          saving={saving}
          errors={crud.errors}
        >
          <div className="grid gap-7">
            <FieldGroup label="Identity" className="sm:grid-cols-2">
              <Field label="Title" htmlFor="p-title" name="title">
                <Input id="p-title" name="title" defaultValue={current?.title} required />
              </Field>
              <Field label="Slug" htmlFor="p-slug" name="slug">
                <Input
                  id="p-slug"
                  name="slug"
                  defaultValue={current?.slug}
                  placeholder="tagaytay-hybrid-home"
                  required
                />
              </Field>
            </FieldGroup>

            <FieldGroup label="System" className="sm:grid-cols-2">
              <Field label="Category" htmlFor="p-category" name="category">
                <OptionSelect id="p-category" name="category" defaultValue={current?.category ?? AUDIENCES[0]} options={AUDIENCES} />
              </Field>
              <Field label="System type" htmlFor="p-system" name="systemType">
                <OptionSelect id="p-system" name="systemType" defaultValue={current?.systemType ?? SYSTEM_TYPES[0]} options={SYSTEM_TYPES} />
              </Field>
              <Field label="Capacity (kW)" htmlFor="p-kw" name="capacityKw">
                <Input id="p-kw" name="capacityKw" type="number" step="0.1" min="0" defaultValue={current?.capacityKw} required className="tabular" />
              </Field>
              <Field label="Battery (kWh) — optional" htmlFor="p-batt" name="batteryKwh">
                <Input id="p-batt" name="batteryKwh" type="number" step="0.1" min="0" defaultValue={current?.batteryKwh ?? ""} className="tabular" />
              </Field>
              <Field label="Location" htmlFor="p-loc" name="location">
                <Input id="p-loc" name="location" defaultValue={current?.location} required />
              </Field>
              <ImageField label="Project image" name="image" defaultValue={current?.image} required error={crud.errors.image} />
            </FieldGroup>

            <FieldGroup label="Story">
              <Field label="Scope" htmlFor="p-scope" name="scope">
                <textarea id="p-scope" name="scope" defaultValue={current?.scope} className={textareaClass} required />
              </Field>
              <Field label="Outcome" htmlFor="p-out" name="outcome">
                <textarea id="p-out" name="outcome" defaultValue={current?.outcome} className={textareaClass} required />
              </Field>
            </FieldGroup>

            <FieldGroup label="Visibility">
              <div className="flex flex-wrap items-center gap-6">
                <CheckboxField label="Featured" name="featured" defaultChecked={current?.featured} />
                <CheckboxField label="Published" name="published" defaultChecked={current?.published} />
              </div>
            </FieldGroup>
          </div>
        </FormShell>
      ) : null}

      {crud.items.length === 0 ? (
        <Card>
          <CardContent className="px-0">
            <EmptyState
              icon={Images}
              title="No projects yet"
              description="Projects are the installations shown on Our Work. Add one to give visitors something to look at."
              action={
                <Button size="sm" onClick={() => crud.setEditing("new")}>
                  <Plus /> Add project
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <SortableList
          items={crud.items}
          onReorder={(ids) => crud.reorder(ids, reorderProjects)}
          renderRow={(p, handle) => (
            <div className="data-row flex-wrap">
              {handle}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 font-medium">
                  <span className="truncate">{p.title}</span>
                  {p.featured ? (
                    <Star
                      className="size-3.5 shrink-0 fill-primary text-primary"
                      aria-label="Featured"
                    />
                  ) : null}
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
                deleteQuestion={`Delete “${p.title}”? This cannot be undone.`}
                onTogglePublish={() => crud.togglePublish(p, setProjectPublished)}
                onEdit={() => crud.setEditing(p)}
                onDelete={() => crud.remove(p, deleteProject)}
              />
            </div>
          )}
        />
      )}

      <ContentPreview preview={preview} onOpenChange={(o) => !o && setPreview(null)} />
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
  const [preview, setPreview] = React.useState<PreviewState | null>(null)

  // Sync the kind selector whenever the editor opens. Adjust state during
  // render by tracking the previous `editing` value — React's recommended
  // alternative to calling setState synchronously inside an effect.
  const [prevEditing, setPrevEditing] = React.useState(editing)
  if (editing !== prevEditing) {
    setPrevEditing(editing)
    if (editing) setKind(current?.kind ?? "video")
  }

  function onPreview(form: HTMLFormElement) {
    const fd = new FormData(form)
    setPreview({
      kind: "testimonial",
      data: {
        kind,
        name: str(fd, "name"),
        location: str(fd, "location"),
        systemType: str(fd, "systemType"),
        headline: str(fd, "headline"),
        summary: str(fd, "summary"),
        thumbnail: str(fd, "thumbnail"),
        quote: str(fd, "quote"),
        photo: str(fd, "photo"),
      },
    })
  }

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
      videoUrl: str(fd, "videoUrl"),
      quote: str(fd, "quote"),
      photo: str(fd, "photo"),
      published: bool(fd, "published"),
      // Ordering is managed by drag-and-drop, not this form; preserve it on edit.
      sortOrder: current?.sortOrder ?? 0,
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
        label="Customer proof"
        title="Testimonials"
        description="Video and written customer proof shown on Home and Customer Stories."
        addLabel="Add testimonial"
        onAdd={() => crud.setEditing("new")}
        adding={editing === "new"}
      />

      {editing ? (
        <FormShell
          key={current?.id ?? "new"}
          title={current ? "Edit testimonial" : "New testimonial"}
          onSubmit={onSubmit}
          onCancel={() => crud.setEditing(null)}
          onPreview={onPreview}
          saving={saving}
          errors={crud.errors}
        >
          <div className="grid gap-7">
            <FieldGroup label="Customer" className="sm:grid-cols-2">
              <Field label="Type" htmlFor="t-kind" name="kind">
                <Select
                  id="t-kind"
                  value={kind}
                  onChange={(e) => setKind(e.target.value as TestimonialItem["kind"])}
                >
                  <option value="video">Video</option>
                  <option value="written">Written</option>
                </Select>
              </Field>
              <Field label="Name" htmlFor="t-name" name="name">
                <Input id="t-name" name="name" defaultValue={current?.name} required />
              </Field>
              <Field label="Location — optional" htmlFor="t-loc" name="location">
                <Input id="t-loc" name="location" defaultValue={current?.location ?? ""} />
              </Field>
              <Field label="Audience" htmlFor="t-aud" name="audience">
                <OptionSelect id="t-aud" name="audience" defaultValue={current?.audience ?? AUDIENCES[0]} options={AUDIENCES} />
              </Field>
              <Field label="System type" htmlFor="t-sys" name="systemType">
                <OptionSelect id="t-sys" name="systemType" defaultValue={current?.systemType ?? SYSTEM_TYPES[0]} options={SYSTEM_TYPES} />
              </Field>
            </FieldGroup>

            {kind === "video" ? (
              <FieldGroup label="Video story">
                <Field label="Headline" htmlFor="t-head" name="headline">
                  <Input id="t-head" name="headline" defaultValue={current?.headline ?? ""} placeholder="“No more dreading the brownouts.”" />
                </Field>
                <Field label="Summary" htmlFor="t-sum" name="summary">
                  <textarea id="t-sum" name="summary" defaultValue={current?.summary ?? ""} className={textareaClass} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <ImageField label="Thumbnail" name="thumbnail" defaultValue={current?.thumbnail} required error={crud.errors.thumbnail} />
                  <VideoField label="Upload video" name="videoUrl" defaultValue={current?.videoUrl} error={crud.errors.videoUrl} />
                </div>
                <Field
                  label="Or paste a YouTube/Vimeo id — optional"
                  htmlFor="t-vid"
                  name="videoId"
                >
                  <Input id="t-vid" name="videoId" defaultValue={current?.videoId ?? ""} placeholder="YouTube/Vimeo id" />
                </Field>
              </FieldGroup>
            ) : (
              <FieldGroup label="Written story">
                <Field label="Quote" htmlFor="t-quote" name="quote">
                  <textarea id="t-quote" name="quote" defaultValue={current?.quote ?? ""} className={textareaClass} />
                </Field>
                <ImageField label="Client photo — optional" name="photo" defaultValue={current?.photo} error={crud.errors.photo} />
              </FieldGroup>
            )}

            <FieldGroup label="Visibility">
              <CheckboxField label="Published" name="published" defaultChecked={current?.published} />
            </FieldGroup>
          </div>
        </FormShell>
      ) : null}

      {crud.items.length === 0 ? (
        <Card>
          <CardContent className="px-0">
            <EmptyState
              icon={MessageSquareQuote}
              title="No testimonials yet"
              description="Add a video or a written quote from a customer. These carry the proof on Home and Customer Stories."
              action={
                <Button size="sm" onClick={() => crud.setEditing("new")}>
                  <Plus /> Add testimonial
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <SortableList
          items={crud.items}
          onReorder={(ids) => crud.reorder(ids, reorderTestimonials)}
          renderRow={(t, handle) => (
            <div className="data-row flex-wrap">
              {handle}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 font-medium">
                  <span className="truncate">{t.name}</span>
                  <Badge tone="neutral" className="capitalize">
                    {t.kind}
                  </Badge>
                  <PublishedBadge published={t.published} />
                </div>
                <div className="truncate text-sm text-muted-foreground">
                  {t.kind === "video" ? t.headline : t.quote}
                </div>
              </div>
              <RowActions
                published={t.published}
                busy={crud.busyId === t.id}
                deleteQuestion={`Delete the testimonial from ${t.name}? This cannot be undone.`}
                onTogglePublish={() => crud.togglePublish(t, setTestimonialPublished)}
                onEdit={() => crud.setEditing(t)}
                onDelete={() => crud.remove(t, deleteTestimonial)}
              />
            </div>
          )}
        />
      )}

      <ContentPreview preview={preview} onOpenChange={(o) => !o && setPreview(null)} />
    </div>
  )
}

// --- faqs -------------------------------------------------------------------

function FaqsManager({ initial }: { initial: FaqItem[] }) {
  const crud = useCrud<FaqItem>(initial, "FAQ")
  const [saving, setSaving] = React.useState(false)
  const [preview, setPreview] = React.useState<PreviewState | null>(null)
  const editing = crud.editing
  const current = editing && editing !== "new" ? editing : null

  function onPreview(form: HTMLFormElement) {
    const fd = new FormData(form)
    setPreview({
      kind: "faq",
      data: {
        question: str(fd, "question"),
        answer: str(fd, "answer"),
        category: str(fd, "category"),
      },
    })
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const input = {
      question: str(fd, "question"),
      answer: str(fd, "answer"),
      category: str(fd, "category") as FaqCategory,
      published: bool(fd, "published"),
      // Ordering is managed by drag-and-drop, not this form; preserve it on edit.
      sortOrder: current?.sortOrder ?? 0,
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
        label="Learning center"
        title="FAQs"
        description="Questions shown in the Learning Center and Solutions accordions."
        addLabel="Add FAQ"
        onAdd={() => crud.setEditing("new")}
        adding={editing === "new"}
      />

      {editing ? (
        <FormShell
          key={current?.id ?? "new"}
          title={current ? "Edit FAQ" : "New FAQ"}
          onSubmit={onSubmit}
          onCancel={() => crud.setEditing(null)}
          onPreview={onPreview}
          saving={saving}
          errors={crud.errors}
        >
          <div className="grid gap-7">
            <FieldGroup label="Question and answer">
              <Field label="Question" htmlFor="f-q" name="question">
                <Input id="f-q" name="question" defaultValue={current?.question} required />
              </Field>
              <Field label="Answer" htmlFor="f-a" name="answer">
                <textarea id="f-a" name="answer" defaultValue={current?.answer} className={textareaClass} required />
              </Field>
            </FieldGroup>

            <FieldGroup label="Placement">
              <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
                <Field label="Category" htmlFor="f-cat" name="category">
                  <OptionSelect id="f-cat" name="category" defaultValue={current?.category ?? FAQ_CATEGORIES[0]} options={FAQ_CATEGORIES} />
                </Field>
                <div className="pb-2">
                  <CheckboxField label="Published" name="published" defaultChecked={current?.published} />
                </div>
              </div>
            </FieldGroup>
          </div>
        </FormShell>
      ) : null}

      {crud.items.length === 0 ? (
        <Card>
          <CardContent className="px-0">
            <EmptyState
              icon={HelpCircle}
              title="No FAQs yet"
              description="Answer the questions visitors ask before they enquire. These fill the Learning Center and the Solutions accordions."
              action={
                <Button size="sm" onClick={() => crud.setEditing("new")}>
                  <Plus /> Add FAQ
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <SortableList
          items={crud.items}
          onReorder={(ids) => crud.reorder(ids, reorderFaqs)}
          renderRow={(f, handle) => (
            <div className="data-row flex-wrap">
              {handle}
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
                deleteQuestion="Delete this FAQ? This cannot be undone."
                onTogglePublish={() => crud.togglePublish(f, setFaqPublished)}
                onEdit={() => crud.setEditing(f)}
                onDelete={() => crud.remove(f, deleteFaq)}
              />
            </div>
          )}
        />
      )}

      <ContentPreview preview={preview} onOpenChange={(o) => !o && setPreview(null)} />
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
    <div className="grid gap-8">
      <div
        role="tablist"
        aria-label="Content type"
        className="flex w-fit max-w-full flex-wrap items-center gap-1 rounded-lg bg-muted/60 p-1"
      >
        {(Object.keys(CONTENT_TYPE_LABEL) as ContentType[]).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              "focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
              tab === t
                ? "bg-card text-foreground shadow-e1"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {CONTENT_TYPE_LABEL[t]}
            <Badge
              tone={tab === t ? "brand" : "neutral"}
              shape="pill"
              size="sm"
              className="tabular"
            >
              {counts[t]}
            </Badge>
          </button>
        ))}
      </div>

      {tab === "projects" ? <ProjectsManager initial={projects} /> : null}
      {tab === "testimonials" ? <TestimonialsManager initial={testimonials} /> : null}
      {tab === "faqs" ? <FaqsManager initial={faqs} /> : null}
    </div>
  )
}
