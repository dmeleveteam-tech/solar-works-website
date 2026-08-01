"use client"

import * as React from "react"
import {
  CheckCheck,
  ChevronDown,
  Inbox,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  Search,
  Send,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import {
  LEAD_STATUSES,
  LEAD_SOURCES,
  STATUS_LABEL,
  SOURCE_LABEL,
  type Lead,
  type LeadStatus,
} from "@/lib/leads-shared"
import {
  BAND_LABEL,
  SCORE_BANDS,
  byPriority,
  contactActions,
  isAwaitingResponse,
  responseUrgency,
  scoreLead,
  shortAge,
  type ContactAction,
  type ScoreBand,
  type Urgency,
} from "@/lib/lead-intel"
import {
  getLeads,
  createLead,
  updateLeadStatus,
  assignLead,
  deleteLead,
} from "@/app/dashboard/actions"
import { convertLeadToProject } from "@/app/dashboard/projects/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ConfirmButton } from "@/components/ui/confirm-button"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { SkeletonRows } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

type Assignee = { id: string; name: string; email: string }

type BadgeTone = React.ComponentProps<typeof Badge>["tone"]

type SortKey = "priority" | "newest" | "score"

const SORT_LABEL: Record<SortKey, string> = {
  priority: "Priority",
  newest: "Newest",
  score: "Highest score",
}

const STATUS_TONE: Record<LeadStatus, BadgeTone> = {
  new: "brand",
  contacted: "info",
  qualified: "warning",
  won: "success",
  lost: "neutral",
}

/**
 * Hot is `warning`, not `danger`. In an amber palette the destructive red reads
 * as "something is broken", while the warm ochre reads as heat — which is what
 * a high-scoring lead actually is.
 */
const BAND_TONE: Record<ScoreBand, BadgeTone> = {
  hot: "warning",
  warm: "info",
  cold: "neutral",
}

const URGENCY_TONE: Record<Urgency, BadgeTone> = {
  fresh: "outline",
  due: "warning",
  overdue: "danger",
}

const URGENCY_LABEL: Record<Urgency, string> = {
  fresh: "in queue",
  due: "waiting",
  overdue: "overdue",
}

const CONTACT_ICON: Record<ContactAction["key"], LucideIcon> = {
  call: Phone,
  email: Mail,
  viber: MessageCircle,
  whatsapp: Send,
  messenger: MessageCircle,
}

/** Long-form date for the "Received" row in an expanded lead. */
const receivedFormat = new Intl.DateTimeFormat("en-PH", {
  dateStyle: "medium",
  timeStyle: "short",
})

function formatReceived(iso: string): string {
  const date = new Date(iso)
  return Number.isNaN(date.getTime()) ? "—" : receivedFormat.format(date)
}

/**
 * Ages are derived from `Date.now()`, so the server-rendered string and the
 * first client render can straddle a minute boundary. The value is cosmetic and
 * self-corrects on the next render, so suppress rather than defer the whole
 * queue behind a mount flag.
 */
function AgeBadge({ lead, className }: { lead: Lead; className?: string }) {
  const urgency = responseUrgency(lead)
  return (
    <Badge
      tone={URGENCY_TONE[urgency]}
      size="sm"
      className={cn("tabular", className)}
      title={`Received ${formatReceived(lead.createdAt)}`}
      suppressHydrationWarning
    >
      {shortAge(lead.createdAt)}
    </Badge>
  )
}

function ScoreBadge({ lead }: { lead: Lead }) {
  const score = scoreLead(lead)
  const why = score.reasons.length
    ? `Scored ${score.value}: ${score.reasons.join(", ")}`
    : `Scored ${score.value}. No strong signals captured yet.`

  return (
    <Badge tone={BAND_TONE[score.band]} size="sm" title={why}>
      {BAND_LABEL[score.band]}
      <span className="tabular opacity-70">{score.value}</span>
    </Badge>
  )
}

function ContactRow({
  lead,
  onLogContact,
  disabled,
}: {
  lead: Lead
  onLogContact: (lead: Lead) => void
  disabled: boolean
}) {
  const actions = contactActions(lead)

  return (
    <div className="flex flex-wrap items-center gap-1">
      {actions.map((action) => {
        const Icon = CONTACT_ICON[action.key]
        return (
          <Button
            key={action.key}
            asChild
            size="icon-sm"
            variant="ghost"
            className="text-muted-foreground hover:text-foreground"
          >
            <a
              href={action.href}
              aria-label={`${action.label} ${lead.name}`}
              title={`${action.label} ${lead.name}`}
              {...(action.external
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
            >
              <Icon />
            </a>
          </Button>
        )
      })}

      {actions.length === 0 ? (
        <span className="text-xs text-muted-foreground">No contact details</span>
      ) : null}

      {/* Only "new" leads have a first touch left to record; past that the
          status already says someone got to them. */}
      {lead.status === "new" ? (
        <Button
          size="xs"
          variant="outline"
          disabled={disabled}
          onClick={() => onLogContact(lead)}
          title="Mark this lead as contacted"
        >
          <CheckCheck />
          Log contact
        </Button>
      ) : null}
    </div>
  )
}

export function LeadsManager({
  initialLeads,
  assignees,
  canDelete,
}: {
  initialLeads: Lead[]
  assignees: Assignee[]
  canDelete: boolean
}) {
  const [leads, setLeads] = React.useState<Lead[]>(initialLeads)
  const [statusFilter, setStatusFilter] = React.useState<LeadStatus | "all">("all")
  const [bandFilter, setBandFilter] = React.useState<ScoreBand | "all">("all")
  const [sort, setSort] = React.useState<SortKey>("priority")
  const [search, setSearch] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [busyId, setBusyId] = React.useState<string | null>(null)
  const [creating, setCreating] = React.useState(false)
  const [addOpen, setAddOpen] = React.useState(false)
  const [newSource, setNewSource] = React.useState<(typeof LEAD_SOURCES)[number]>("manual")
  // Ids of leads whose captured details are expanded. A set, not a single id,
  // so two enquiries can be compared side by side.
  const [expanded, setExpanded] = React.useState<ReadonlySet<string>>(new Set())
  // Ids of leads showing the inline "convert to project" form.
  const [converting, setConverting] = React.useState<ReadonlySet<string>>(new Set())
  const [convertBusyId, setConvertBusyId] = React.useState<string | null>(null)
  // Ids already converted this session — guards against an accidental
  // double-click creating two projects for the same lead.
  const [converted, setConverted] = React.useState<ReadonlySet<string>>(new Set())

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (!next.delete(id)) next.add(id)
      return next
    })
  }

  function toggleConverting(id: string) {
    setConverting((prev) => {
      const next = new Set(prev)
      if (!next.delete(id)) next.add(id)
      return next
    })
  }

  const reload = React.useCallback(
    async (status: LeadStatus | "all", searchValue: string) => {
      setLoading(true)
      const res = await getLeads({
        status: status === "all" ? undefined : status,
        search: searchValue.trim() || undefined,
      })
      setLoading(false)
      if (!res.ok) {
        toast.error(res.error)
        return
      }
      setLeads(res.data)
    },
    [],
  )

  function onFilter(status: LeadStatus | "all") {
    setStatusFilter(status)
    reload(status, search)
  }

  // Band and order are derived from fields already in memory, so they stay on
  // the client — re-sorting the inbox shouldn't cost a round trip.
  const visible = React.useMemo(() => {
    const list = leads.filter(
      (lead) => bandFilter === "all" || scoreLead(lead).band === bandFilter,
    )
    if (sort === "newest") {
      return list.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
    }
    if (sort === "score") {
      return list.sort((a, b) => scoreLead(b).value - scoreLead(a).value)
    }
    return list.sort(byPriority)
  }, [leads, bandFilter, sort])

  const queue = React.useMemo(
    () => leads.filter(isAwaitingResponse).sort(byPriority),
    [leads],
  )

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)

    setCreating(true)
    const res = await createLead({
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? ""),
      phone: String(fd.get("phone") ?? ""),
      message: String(fd.get("message") ?? ""),
      source: newSource,
    })
    setCreating(false)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    toast.success(`Added lead: ${res.data.name}`)
    form.reset()
    setNewSource("manual")
    setAddOpen(false)
    // Prepend if it matches the current filter, else just refresh the count.
    if (statusFilter === "all" || statusFilter === "new") {
      setLeads((prev) => [res.data, ...prev])
    }
  }

  async function onStatus(lead: Lead, status: LeadStatus): Promise<boolean> {
    setBusyId(lead.id)
    const res = await updateLeadStatus({ id: lead.id, status })
    setBusyId(null)
    if (!res.ok) {
      toast.error(res.error)
      return false
    }
    // Drop it from the list if it no longer matches the active filter.
    if (statusFilter !== "all" && status !== statusFilter) {
      setLeads((prev) => prev.filter((l) => l.id !== lead.id))
    } else {
      setLeads((prev) => prev.map((l) => (l.id === lead.id ? res.data : l)))
    }
    return true
  }

  async function onLogContact(lead: Lead) {
    const ok = await onStatus(lead, "contacted")
    if (ok) toast.success(`Logged contact with ${lead.name}`)
  }

  async function onAssign(lead: Lead, assigneeId: string) {
    setBusyId(lead.id)
    const res = await assignLead({
      id: lead.id,
      assigneeId: assigneeId || null,
    })
    setBusyId(null)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    setLeads((prev) => prev.map((l) => (l.id === lead.id ? res.data : l)))
  }

  async function onDelete(lead: Lead) {
    setBusyId(lead.id)
    const res = await deleteLead({ id: lead.id })
    setBusyId(null)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    toast.success("Lead deleted")
    setLeads((prev) => prev.filter((l) => l.id !== lead.id))
  }

  async function onConvert(lead: Lead, e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const displayName = String(fd.get("displayName") ?? "").trim()
    const siteAddress = String(fd.get("siteAddress") ?? "").trim()

    setConvertBusyId(lead.id)
    const res = await convertLeadToProject({ leadId: lead.id, displayName, siteAddress })
    setConvertBusyId(null)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    toast.success(`Project created: ${res.data.displayName}`)
    toggleConverting(lead.id)
    setConverted((prev) => new Set(prev).add(lead.id))
    // The action also flips the lead's status to "won" server-side; reflect
    // it locally so the pill and filter update without a reload.
    setLeads((prev) =>
      prev.map((l) => (l.id === lead.id ? { ...l, status: "won" as LeadStatus } : l)),
    )
  }

  const filtersActive = statusFilter !== "all" || bandFilter !== "all" || search.trim() !== ""

  return (
    <div className="grid gap-5">
      {/* Speed to lead */}
      <section aria-labelledby="reply-queue-heading">
        {queue.length === 0 ? (
          <div className="flex items-center gap-2.5 rounded-xl bg-success-soft px-4 py-3 text-sm text-success">
            <CheckCheck aria-hidden className="size-4 shrink-0" />
            <h2 id="reply-queue-heading" className="font-medium">
              Every new enquiry has been answered.
            </h2>
          </div>
        ) : (
          <Card className="gap-0 py-0 ring-warning/25">
            <CardContent className="p-0">
              <div className="flex items-center gap-2 border-b border-border/60 bg-warning-soft px-4 py-2.5">
                <h2 id="reply-queue-heading" className="section-label text-warning">
                  Needs a reply
                </h2>
                <Badge tone="warning" shape="pill" size="sm" className="tabular">
                  {queue.length}
                </Badge>
              </div>
              <ul className="divide-y divide-border/60">
                {queue.map((lead) => (
                  <li key={lead.id} className="data-row flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-medium">{lead.name}</span>
                        <ScoreBadge lead={lead} />
                        <AgeBadge lead={lead} />
                        <span className="text-xs text-muted-foreground">
                          {URGENCY_LABEL[responseUrgency(lead)]}
                        </span>
                      </div>
                      <p className="truncate text-sm text-muted-foreground">
                        {[lead.email, lead.phone].filter(Boolean).join(" · ") || "—"}
                      </p>
                    </div>
                    <ContactRow
                      lead={lead}
                      onLogContact={onLogContact}
                      disabled={busyId === lead.id}
                    />
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Toolbar */}
      <div className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div
            role="group"
            aria-label="Filter by status"
            className="inline-flex items-center gap-0.5 rounded-lg bg-muted/60 p-0.5 ring-1 ring-border/60"
          >
            {(["all", ...LEAD_STATUSES] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onFilter(s)}
                aria-pressed={statusFilter === s}
                className={cn(
                  "rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors outline-none",
                  "focus-visible:ring-3 focus-visible:ring-ring/50",
                  statusFilter === s
                    ? "bg-primary text-primary-foreground shadow-e1"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {s === "all" ? "All" : STATUS_LABEL[s]}
              </button>
            ))}
          </div>

          <Button
            variant={addOpen ? "secondary" : "default"}
            onClick={() => setAddOpen((v) => !v)}
            aria-expanded={addOpen}
            aria-controls="new-lead-panel"
            className="ml-auto"
          >
            {addOpen ? <X /> : <Plus />}
            {addOpen ? "Close" : "New lead"}
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") reload(statusFilter, search)
              }}
              placeholder="Search name, email, phone…"
              aria-label="Search leads"
              className="pl-8"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => reload(statusFilter, search)}
            disabled={loading}
          >
            {loading ? <Loader2 className="animate-spin" /> : "Search"}
          </Button>

          <div className="w-36">
            <Select
              aria-label="Filter by score band"
              value={bandFilter}
              onChange={(e) => setBandFilter(e.target.value as ScoreBand | "all")}
            >
              <option value="all">All scores</option>
              {SCORE_BANDS.map((band) => (
                <option key={band} value={band}>
                  {BAND_LABEL[band]}
                </option>
              ))}
            </Select>
          </div>

          <div className="w-44">
            <Select
              aria-label="Sort leads"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
            >
              {(Object.keys(SORT_LABEL) as SortKey[]).map((key) => (
                <option key={key} value={key}>
                  Sort: {SORT_LABEL[key]}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      {/* Add lead — collapsed by default; it is used a handful of times a day
          and used to cost the inbox its first screenful. */}
      {addOpen ? (
        <Card id="new-lead-panel">
          <CardContent>
            <form onSubmit={onCreate} className="grid gap-4">
              <p className="section-label">New lead</p>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="lead-name">Name</Label>
                  <Input id="lead-name" name="name" required placeholder="Juan dela Cruz" />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="lead-email">Email</Label>
                  <Input
                    id="lead-email"
                    name="email"
                    type="email"
                    placeholder="juan@email.com"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="lead-phone">Phone</Label>
                  <Input id="lead-phone" name="phone" placeholder="0917 000 0000" />
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-[12rem_1fr_auto] md:items-end">
                <div className="grid gap-1.5">
                  <Label htmlFor="lead-source">Source</Label>
                  <Select
                    id="lead-source"
                    value={newSource}
                    onChange={(e) =>
                      setNewSource(e.target.value as (typeof LEAD_SOURCES)[number])
                    }
                  >
                    {LEAD_SOURCES.map((s) => (
                      <option key={s} value={s}>
                        {SOURCE_LABEL[s]}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="lead-message">Notes</Label>
                  <Input id="lead-message" name="message" placeholder="Optional" />
                </div>
                <Button type="submit" disabled={creating}>
                  {creating ? <Loader2 className="animate-spin" /> : <Plus />}
                  Add lead
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {/* Inbox */}
      <Card className="gap-0 py-0">
        <CardContent className="p-0">
          {loading && leads.length === 0 ? (
            <SkeletonRows rows={6} />
          ) : visible.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title={filtersActive ? "No leads match these filters" : "No leads here yet"}
              description={
                filtersActive
                  ? "Widen the status or score filter, or clear the search box."
                  : "Enquiries from the website form, chatbot and Google Form land here automatically. You can also add one by hand."
              }
              action={
                filtersActive ? null : (
                  <Button onClick={() => setAddOpen(true)}>
                    <Plus />
                    New lead
                  </Button>
                )
              }
            />
          ) : (
            <div className="divide-y divide-border/60">
              {visible.map((lead) => {
                const busy = busyId === lead.id
                // Everything the form or chatbot captured beyond the columns
                // above — address, property type, consumption, goals, consent,
                // marketing attribution, and so on.
                const captured = Object.entries(lead.details ?? {})
                const extras = captured.length + (lead.message ? 1 : 0)
                const open = expanded.has(lead.id)
                const panelId = `lead-details-${lead.id}`
                const score = scoreLead(lead)

                return (
                  <div key={lead.id} className="transition-colors hover:bg-foreground/3">
                    <div
                      className={cn(
                        "grid gap-3 px-4 py-3.5",
                        // Fixed control widths rather than `auto`, so the status
                        // and assignee columns line up down the whole list
                        // instead of jittering with each row's content.
                        "md:grid-cols-[minmax(0,1fr)_8.5rem_11rem_auto] md:items-center",
                      )}
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate font-medium">{lead.name}</span>
                          <Badge tone={STATUS_TONE[lead.status]} size="sm">
                            {STATUS_LABEL[lead.status]}
                          </Badge>
                          <ScoreBadge lead={lead} />
                          <AgeBadge lead={lead} />
                          <Badge tone="outline" size="sm">
                            {SOURCE_LABEL[lead.source]}
                          </Badge>
                        </div>
                        <div className="mt-0.5 truncate text-sm text-muted-foreground">
                          {[lead.email, lead.phone].filter(Boolean).join(" · ") || "—"}
                        </div>
                        <div className="mt-2">
                          <ContactRow
                            lead={lead}
                            onLogContact={onLogContact}
                            disabled={busy}
                          />
                        </div>
                      </div>

                      <Select
                        aria-label={`Status for ${lead.name}`}
                        value={lead.status}
                        disabled={busy}
                        onChange={(e) => onStatus(lead, e.target.value as LeadStatus)}
                      >
                        {LEAD_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABEL[s]}
                          </option>
                        ))}
                      </Select>

                      <Select
                        aria-label={`Assigned to, for ${lead.name}`}
                        value={lead.assignedToId ?? ""}
                        disabled={busy}
                        onChange={(e) => onAssign(lead, e.target.value)}
                      >
                        <option value="">Unassigned</option>
                        {assignees.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name || a.email}
                          </option>
                        ))}
                      </Select>

                      <div className="flex flex-wrap items-center justify-end gap-1">
                        {busy ? (
                          <Loader2
                            aria-hidden
                            className="size-4 animate-spin text-muted-foreground"
                          />
                        ) : null}

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpanded(lead.id)}
                          aria-expanded={open}
                          aria-controls={panelId}
                          className="text-muted-foreground"
                        >
                          <ChevronDown
                            className={cn("transition-transform", open && "rotate-180")}
                          />
                          {extras > 0 ? `Details (${extras})` : "Details"}
                        </Button>

                        {!converted.has(lead.id) ? (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busy}
                            aria-expanded={converting.has(lead.id)}
                            onClick={() => toggleConverting(lead.id)}
                          >
                            Convert
                          </Button>
                        ) : null}

                        {canDelete ? (
                          <ConfirmButton
                            question={`Delete the lead from ${lead.name}?`}
                            confirmLabel="Delete"
                            disabled={busy}
                            onConfirm={() => onDelete(lead)}
                          >
                            <Trash2 />
                            <span className="hidden sm:inline">Delete</span>
                          </ConfirmButton>
                        ) : null}
                      </div>
                    </div>

                    {converting.has(lead.id) ? (
                      <div className="border-t border-border/60 bg-muted/20 px-4 pt-3 pb-4">
                        <form
                          onSubmit={(e) => onConvert(lead, e)}
                          className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
                        >
                          <div className="grid gap-1.5">
                            <Label htmlFor={`convert-name-${lead.id}`}>Project name</Label>
                            <Input
                              id={`convert-name-${lead.id}`}
                              name="displayName"
                              required
                              maxLength={120}
                              defaultValue={lead.name ? `${lead.name} residence` : ""}
                            />
                          </div>
                          <div className="grid gap-1.5">
                            <Label htmlFor={`convert-address-${lead.id}`}>
                              Site address (optional)
                            </Label>
                            <Input
                              id={`convert-address-${lead.id}`}
                              name="siteAddress"
                              maxLength={300}
                            />
                          </div>
                          <Button type="submit" size="sm" disabled={convertBusyId === lead.id}>
                            {convertBusyId === lead.id ? (
                              <Loader2 className="animate-spin" />
                            ) : null}
                            Create project
                          </Button>
                        </form>
                        {!lead.email ? (
                          <p className="mt-2 text-xs text-destructive">
                            This lead has no email on file. Add one before converting.
                          </p>
                        ) : null}
                      </div>
                    ) : null}

                    {open ? (
                      <div
                        id={panelId}
                        className="border-t border-border/60 bg-muted/40 px-4 pt-4 pb-5 text-sm"
                      >
                        {lead.message ? (
                          <div className="mb-5">
                            <p className="section-label mb-2">Message</p>
                            <p className="max-w-[70ch] whitespace-pre-wrap">
                              {lead.message}
                            </p>
                          </div>
                        ) : null}

                        <p className="section-label mb-2">Captured details</p>
                        <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                          {captured.map(([label, value]) => (
                            <div key={label} className="grid gap-0.5">
                              <dt className="text-xs text-muted-foreground">{label}</dt>
                              <dd className="break-words">{value}</dd>
                            </div>
                          ))}
                          <div className="grid gap-0.5">
                            <dt className="text-xs text-muted-foreground">Received</dt>
                            <dd className="tabular">{formatReceived(lead.createdAt)}</dd>
                          </div>
                          {lead.refId ? (
                            <div className="grid gap-0.5">
                              <dt className="text-xs text-muted-foreground">Reference</dt>
                              <dd className="tabular">{lead.refId}</dd>
                            </div>
                          ) : null}
                        </dl>

                        {extras === 0 ? (
                          <p className="mt-3 text-muted-foreground">
                            Nothing else was captured with this lead.
                          </p>
                        ) : null}

                        <div className="mt-5 border-t border-border/60 pt-4">
                          <p className="section-label mb-2">
                            Why this scored {score.value}
                          </p>
                          {score.reasons.length ? (
                            <ul className="flex flex-wrap gap-1.5">
                              {score.reasons.map((reason) => (
                                <li key={reason}>
                                  <Badge tone={BAND_TONE[score.band]} size="sm">
                                    {reason}
                                  </Badge>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-muted-foreground">
                              No strong buying signals were captured, so this sits at
                              the bottom of the queue.
                            </p>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
