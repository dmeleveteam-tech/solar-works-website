"use client"

import * as React from "react"
import { ChevronDown, Loader2, Plus, Search, Trash2 } from "lucide-react"
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
  getLeads,
  createLead,
  updateLeadStatus,
  assignLead,
  deleteLead,
} from "@/app/dashboard/actions"
import { convertLeadToProject } from "@/app/dashboard/projects/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"

type Assignee = { id: string; name: string; email: string }

/** Tailwind classes per status, for the inline status pill. */
const STATUS_TONE: Record<LeadStatus, string> = {
  new: "bg-primary/10 text-primary-strong",
  contacted: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  qualified: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  won: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  lost: "bg-muted text-muted-foreground",
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

const selectClass = cn(
  "h-9 rounded-md border border-input bg-transparent px-2.5 text-sm shadow-xs outline-none",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
  "disabled:pointer-events-none disabled:opacity-50",
)

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
  const [search, setSearch] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [busyId, setBusyId] = React.useState<string | null>(null)
  const [creating, setCreating] = React.useState(false)
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
    // Prepend if it matches the current filter, else just refresh the count.
    if (statusFilter === "all" || statusFilter === "new") {
      setLeads((prev) => [res.data, ...prev])
    }
  }

  async function onStatus(lead: Lead, status: LeadStatus) {
    setBusyId(lead.id)
    const res = await updateLeadStatus({ id: lead.id, status })
    setBusyId(null)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    // Drop it from the list if it no longer matches the active filter.
    if (statusFilter !== "all" && status !== statusFilter) {
      setLeads((prev) => prev.filter((l) => l.id !== lead.id))
    } else {
      setLeads((prev) => prev.map((l) => (l.id === lead.id ? res.data : l)))
    }
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
    if (!window.confirm(`Delete the lead from ${lead.name}? This cannot be undone.`)) {
      return
    }
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

  return (
    <div className="grid gap-6">
      {/* Add lead */}
      <Card>
        <CardContent>
          <form
            onSubmit={onCreate}
            className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto_auto] md:items-end"
          >
            <div className="grid gap-1.5">
              <Label htmlFor="lead-name">Name</Label>
              <Input id="lead-name" name="name" required placeholder="Juan dela Cruz" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lead-email">Email</Label>
              <Input id="lead-email" name="email" type="email" placeholder="juan@email.com" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lead-phone">Phone</Label>
              <Input id="lead-phone" name="phone" placeholder="0917 000 0000" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="lead-source">Source</Label>
              <select
                id="lead-source"
                value={newSource}
                onChange={(e) =>
                  setNewSource(e.target.value as (typeof LEAD_SOURCES)[number])
                }
                className={selectClass}
              >
                {LEAD_SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {SOURCE_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" disabled={creating}>
              {creating ? <Loader2 className="animate-spin" /> : <Plus />}
              Add lead
            </Button>
            <div className="md:col-span-5">
              <Label htmlFor="lead-message" className="sr-only">
                Notes
              </Label>
              <Input id="lead-message" name="message" placeholder="Notes (optional)" />
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-1">
          {(["all", ...LEAD_STATUSES] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onFilter(s)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm transition-colors",
                statusFilter === s
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {s === "all" ? "All" : STATUS_LABEL[s]}
            </button>
          ))}
        </div>

        <div className="relative ml-auto max-w-xs flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") reload(statusFilter, search)
            }}
            placeholder="Search name, email, phone…"
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
      </div>

      {/* List */}
      <Card>
        <CardContent className="p-0">
          {loading && leads.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <Loader2 className="mx-auto size-5 animate-spin" />
            </div>
          ) : leads.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No leads here yet. Add one above, or they&apos;ll arrive from the
              website form and chatbot.
            </div>
          ) : (
            <div className="divide-y">
              {leads.map((lead) => {
                const busy = busyId === lead.id
                // Everything the form or chatbot captured beyond the columns
                // above — address, property type, consumption, goals, consent,
                // marketing attribution, and so on.
                const captured = Object.entries(lead.details ?? {})
                const extras = captured.length + (lead.message ? 1 : 0)
                const open = expanded.has(lead.id)
                const panelId = `lead-details-${lead.id}`

                return (
                  <div key={lead.id}>
                    <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 font-medium">
                          <span className="truncate">{lead.name}</span>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-xs font-medium",
                              STATUS_TONE[lead.status],
                            )}
                          >
                            {STATUS_LABEL[lead.status]}
                          </span>
                          <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                            {SOURCE_LABEL[lead.source]}
                          </span>
                        </div>
                        <div className="truncate text-sm text-muted-foreground">
                          {[lead.email, lead.phone].filter(Boolean).join(" · ") || "—"}
                        </div>
                      </div>

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

                      <select
                        aria-label="Status"
                        value={lead.status}
                        disabled={busy}
                        onChange={(e) => onStatus(lead, e.target.value as LeadStatus)}
                        className={selectClass}
                      >
                        {LEAD_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABEL[s]}
                          </option>
                        ))}
                      </select>

                      <select
                        aria-label="Assigned to"
                        value={lead.assignedToId ?? ""}
                        disabled={busy}
                        onChange={(e) => onAssign(lead, e.target.value)}
                        className={cn(selectClass, "max-w-40")}
                      >
                        <option value="">Unassigned</option>
                        {assignees.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name || a.email}
                          </option>
                        ))}
                      </select>

                      {busy ? (
                        <Loader2 className="size-4 animate-spin text-muted-foreground" />
                      ) : null}

                      {!converted.has(lead.id) ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busy}
                          onClick={() => toggleConverting(lead.id)}
                        >
                          Convert to project
                        </Button>
                      ) : null}

                      {canDelete ? (
                        <Button
                          variant="destructive"
                          size="sm"
                          disabled={busy}
                          onClick={() => onDelete(lead)}
                        >
                          <Trash2 />
                          <span className="hidden sm:inline">Delete</span>
                        </Button>
                      ) : null}
                    </div>

                    {converting.has(lead.id) ? (
                      <div className="border-t bg-muted/20 px-4 pt-3 pb-4">
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
                            This lead has no email on file — add one before converting.
                          </p>
                        ) : null}
                      </div>
                    ) : null}

                    {open ? (
                      <div id={panelId} className="bg-muted/40 px-4 pt-3 pb-4 text-sm">
                        {lead.message ? (
                          <p className="mb-4 whitespace-pre-wrap">{lead.message}</p>
                        ) : null}

                        <dl className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
                          {captured.map(([label, value]) => (
                            <div key={label} className="grid gap-0.5">
                              <dt className="text-xs text-muted-foreground">{label}</dt>
                              <dd className="break-words">{value}</dd>
                            </div>
                          ))}
                          <div className="grid gap-0.5">
                            <dt className="text-xs text-muted-foreground">Received</dt>
                            <dd>{formatReceived(lead.createdAt)}</dd>
                          </div>
                        </dl>

                        {extras === 0 ? (
                          <p className="mt-3 text-muted-foreground">
                            Nothing else was captured with this lead.
                          </p>
                        ) : null}
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
