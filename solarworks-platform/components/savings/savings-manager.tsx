"use client"

import * as React from "react"
import {
  ChevronDown,
  Loader2,
  Plus,
  PlugZap,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  Upload,
  Wrench,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import {
  SUGGESTED_PROVIDERS,
  DEFAULT_SAVINGS_BASIS,
  SAVINGS_BASIS_LABEL,
  SAVINGS_BASIS_DESCRIPTION,
  type Tariff,
  type SavingsPlant,
} from "@/lib/savings-shared"
import {
  saveTariff,
  removeTariff,
  createPlant,
  setConsent,
  removePlant,
  uploadReadings,
  type LinkableCustomer,
} from "@/app/dashboard/savings/actions"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
import { Card, CardContent } from "@/components/ui/card"

export function SavingsManager({
  initialTariffs,
  initialPlants,
  customers,
  canDelete,
  parserReady,
}: {
  initialTariffs: Tariff[]
  initialPlants: SavingsPlant[]
  customers: LinkableCustomer[]
  canDelete: boolean
  parserReady: boolean
}) {
  const [tariffs, setTariffs] = React.useState(initialTariffs)
  const [plants, setPlants] = React.useState(initialPlants)

  const providerNames = tariffs.map((t) => t.provider)

  return (
    <div className="grid gap-10">
      <BasisNotice />
      <TariffSection
        tariffs={tariffs}
        setTariffs={setTariffs}
        canDelete={canDelete}
      />
      <PlantSection
        plants={plants}
        setPlants={setPlants}
        customers={customers}
        providerNames={providerNames}
        canDelete={canDelete}
        parserReady={parserReady}
      />
    </div>
  )
}

/** One heading shape for every section on the page. */
function SectionHeading({
  label,
  title,
  description,
  action,
}: {
  label: string
  title: string
  description: string
  action?: React.ReactNode
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
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}

/**
 * Surfaces the still-pending "what counts as saved" decision to staff. This is
 * a caveat on every peso figure downstream, so it gets the full advisory
 * treatment — accent rail, icon, warning ramp — rather than a tinted card that
 * disappears into the app's own amber background.
 */
function BasisNotice() {
  return (
    <div
      role="note"
      className="relative grain flex gap-3.5 overflow-hidden rounded-xl border-l-4 border-warning bg-warning-soft p-4 ring-1 ring-warning/25"
    >
      <TriangleAlert className="mt-0.5 size-5 shrink-0 text-warning" aria-hidden />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-warning">
            Savings basis: {SAVINGS_BASIS_LABEL[DEFAULT_SAVINGS_BASIS]}
          </p>
          <Badge tone="warning" size="sm" className="ring-1 ring-warning/30">
            Provisional
          </Badge>
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-pretty text-foreground/80">
          {SAVINGS_BASIS_DESCRIPTION[DEFAULT_SAVINGS_BASIS]} The final basis is
          pending the client&apos;s decision. Every peso figure is shown as an
          estimate.
        </p>
      </div>
    </div>
  )
}

// --- tariffs ----------------------------------------------------------------

function TariffSection({
  tariffs,
  setTariffs,
  canDelete,
}: {
  tariffs: Tariff[]
  setTariffs: React.Dispatch<React.SetStateAction<Tariff[]>>
  canDelete: boolean
}) {
  const [saving, setSaving] = React.useState(false)
  const providerRef = React.useRef<HTMLInputElement>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<Tariff | null>(null)
  const [deleteBusy, setDeleteBusy] = React.useState(false)

  function upsert(t: Tariff) {
    setTariffs((prev) => {
      const i = prev.findIndex((x) => x.provider === t.provider)
      if (i === -1) return [...prev, t].sort((a, b) => a.provider.localeCompare(b.provider))
      const next = [...prev]
      next[i] = t
      return next
    })
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const provider = String(fd.get("provider") ?? "").trim()
    const ratePerKwh = Number(fd.get("ratePerKwh"))
    setSaving(true)
    const res = await saveTariff({ provider, ratePerKwh })
    setSaving(false)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    upsert(res.data)
    toast.success("Tariff saved.")
    e.currentTarget.reset()
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    const t = deleteTarget
    setDeleteBusy(true)
    const res = await removeTariff({ id: t.id })
    setDeleteBusy(false)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    setTariffs((prev) => prev.filter((x) => x.id !== t.id))
    toast.success("Tariff removed.")
    setDeleteTarget(null)
  }

  return (
    <section className="grid gap-4">
      <SectionHeading
        label="Rates"
        title="Utility tariffs"
        description="Flat ₱/kWh rate per provider. Used to price each customer's savings."
      />

      <Card>
        <CardContent className="grid gap-5">
          {tariffs.length > 0 ? (
            <ul className="divide-y divide-border/60 overflow-hidden rounded-lg ring-1 ring-border">
              {tariffs.map((t) => (
                <li key={t.id} className="data-row text-sm">
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {t.provider}
                  </span>
                  {/* Fixed-width tabular column so rates line up decimal-to-decimal
                      and can be compared by scanning straight down. */}
                  <span className="tabular w-28 shrink-0 text-right">
                    ₱{t.ratePerKwh.toFixed(2)}
                    <span className="text-muted-foreground">/kWh</span>
                  </span>
                  {canDelete ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget(t)}
                      className="text-destructive hover:text-destructive"
                      aria-label={`Remove ${t.provider} tariff`}
                    >
                      <X /> Remove
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={PlugZap}
              title="No tariffs yet"
              description="Add the ₱/kWh rate for each utility your customers buy from. Savings can't be priced without one."
              action={
                <Button size="sm" onClick={() => providerRef.current?.focus()}>
                  <Plus /> Add the first tariff
                </Button>
              }
            />
          )}

          <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2">
            <div className="grid flex-1 gap-1.5">
              <Label htmlFor="provider">Provider</Label>
              <Input
                ref={providerRef}
                id="provider"
                name="provider"
                list="provider-suggestions"
                required
                maxLength={80}
                placeholder="e.g. Meralco"
              />
              <datalist id="provider-suggestions">
                {SUGGESTED_PROVIDERS.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </div>
            <div className="grid w-40 gap-1.5">
              <Label htmlFor="ratePerKwh">Rate (₱/kWh)</Label>
              <Input
                id="ratePerKwh"
                name="ratePerKwh"
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="12.50"
                className="tabular"
              />
            </div>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : <Plus />}
              Save tariff
            </Button>
          </form>
        </CardContent>
      </Card>

      <DeleteConfirmDialog
        open={deleteTarget != null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Remove this tariff?"
        description={deleteTarget ? `Remove the ${deleteTarget.provider} tariff?` : ""}
        busy={deleteBusy}
        onConfirm={confirmDelete}
        confirmLabel="Remove"
      />
    </section>
  )
}

// --- plant links ------------------------------------------------------------

function PlantSection({
  plants,
  setPlants,
  customers,
  providerNames,
  canDelete,
  parserReady,
}: {
  plants: SavingsPlant[]
  setPlants: React.Dispatch<React.SetStateAction<SavingsPlant[]>>
  customers: LinkableCustomer[]
  providerNames: string[]
  canDelete: boolean
  parserReady: boolean
}) {
  const [adding, setAdding] = React.useState(false)

  function upsert(updated: SavingsPlant) {
    setPlants((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
  }

  return (
    <section className="grid gap-4">
      <SectionHeading
        label="Links"
        title="Customer plants"
        description="Link a customer account to their Deye plant and utility provider."
        action={
          <Button size="sm" onClick={() => setAdding((v) => !v)}>
            {adding ? <X /> : <Plus />}
            {adding ? "Cancel" : "Link plant"}
          </Button>
        }
      />

      {adding ? (
        <CreatePlantForm
          customers={customers}
          providerNames={providerNames}
          onCreated={(plant) => {
            setPlants((prev) => [plant, ...prev])
            setAdding(false)
          }}
        />
      ) : null}

      {plants.length === 0 ? (
        <Card>
          <CardContent className="px-0">
            <EmptyState
              icon={PlugZap}
              title="No plants linked yet"
              description="Linking a customer to their Deye plant is what lets their portal show generation and savings."
              action={
                adding ? undefined : (
                  <Button size="sm" onClick={() => setAdding(true)}>
                    <Plus /> Link a plant
                  </Button>
                )
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {plants.map((plant) => (
            <PlantCard
              key={plant.id}
              plant={plant}
              canDelete={canDelete}
              parserReady={parserReady}
              onChange={upsert}
              onDeleted={(id) => setPlants((prev) => prev.filter((p) => p.id !== id))}
            />
          ))}
        </div>
      )}
    </section>
  )
}

function CreatePlantForm({
  customers,
  providerNames,
  onCreated,
}: {
  customers: LinkableCustomer[]
  providerNames: string[]
  onCreated: (plant: SavingsPlant) => void
}) {
  const [mode, setMode] = React.useState<"existing" | "new">(
    customers.length > 0 ? "existing" : "new",
  )
  const [saving, setSaving] = React.useState(false)

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const base = {
      plantRef: String(fd.get("plantRef") ?? "").trim(),
      provider: String(fd.get("provider") ?? "").trim(),
    }
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
    const res = await createPlant(input)
    setSaving(false)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    toast.success("Plant linked.")
    onCreated(res.data)
  }

  return (
    <Card>
      <CardContent>
        <form onSubmit={onSubmit} className="grid gap-6">
          <div role="group" aria-label="Customer" className="grid gap-3">
            <p className="section-label">Customer</p>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant={mode === "existing" ? "default" : "outline"}
                onClick={() => setMode("existing")}
                disabled={customers.length === 0}
                aria-pressed={mode === "existing"}
              >
                Existing customer
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === "new" ? "default" : "outline"}
                onClick={() => setMode("new")}
                aria-pressed={mode === "new"}
              >
                New customer account
              </Button>
            </div>

            {mode === "existing" ? (
              <div className="grid gap-1.5">
                <Label htmlFor="customerUserId">Customer</Label>
                <Select id="customerUserId" name="customerUserId" required>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name ? `${c.name} — ${c.email}` : c.email}
                    </option>
                  ))}
                </Select>
              </div>
            ) : (
              <>
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
                <p className="text-xs text-muted-foreground">
                  This creates a customer login. Share the email and temporary
                  password with them; they can sign in at the portal.
                </p>
              </>
            )}
          </div>

          <div role="group" aria-label="Plant" className="grid gap-3 border-t pt-5">
            <p className="section-label">Plant</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="plantRef">Deye plant reference</Label>
                <Input
                  id="plantRef"
                  name="plantRef"
                  required
                  maxLength={120}
                  placeholder="e.g. Solarman plant ID or site name"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="plant-provider">Utility provider</Label>
                <Input
                  id="plant-provider"
                  name="provider"
                  list="plant-provider-suggestions"
                  required
                  maxLength={80}
                  placeholder="e.g. Meralco"
                />
                <datalist id="plant-provider-suggestions">
                  {providerNames.map((p) => (
                    <option key={p} value={p} />
                  ))}
                </datalist>
              </div>
            </div>
          </div>

          <div className="flex justify-end border-t pt-5">
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : <Plus />}
              Link plant
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

/**
 * Consent gates every savings email (NFR-03), so its absence is the state staff
 * need to notice — it gets the warning ramp and a ring, while the satisfied
 * state stays quiet.
 */
function ConsentBadge({ consented }: { consented: boolean }) {
  return consented ? (
    <Badge tone="success">
      <ShieldCheck aria-hidden /> Email consent given
    </Badge>
  ) : (
    <Badge tone="warning" className="ring-1 ring-warning/35">
      <ShieldAlert aria-hidden /> No email consent
    </Badge>
  )
}

function PlantCard({
  plant,
  canDelete,
  parserReady,
  onChange,
  onDeleted,
}: {
  plant: SavingsPlant
  canDelete: boolean
  parserReady: boolean
  onChange: (plant: SavingsPlant) => void
  onDeleted: (id: string) => void
}) {
  const [open, setOpen] = React.useState(false)
  const panelId = React.useId()

  return (
    <Card size="sm">
      <CardContent>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "-mx-2 flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left transition-colors",
            "hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
          )}
          aria-expanded={open}
          aria-controls={panelId}
        >
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">
              {plant.customerName ? `${plant.customerName} · ` : ""}
              {plant.plantRef}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {plant.customerEmail} · {plant.provider}
            </p>
          </div>
          <ConsentBadge consented={Boolean(plant.emailConsentAt)} />
          <ChevronDown
            aria-hidden
            className={cn(
              "size-4 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
        </button>

        <div id={panelId} hidden={!open}>
          {open ? (
            <div className="mt-4 grid gap-6 border-t pt-5">
              <ConsentToggle plant={plant} onChange={onChange} />
              <UploadReadings plant={plant} parserReady={parserReady} onChange={onChange} />
              {canDelete ? <DeletePlant plant={plant} onDeleted={onDeleted} /> : null}
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}

function ConsentToggle({
  plant,
  onChange,
}: {
  plant: SavingsPlant
  onChange: (plant: SavingsPlant) => void
}) {
  const [busy, setBusy] = React.useState(false)
  const consented = Boolean(plant.emailConsentAt)

  async function onToggle() {
    setBusy(true)
    const res = await setConsent({ id: plant.id, consented: !consented })
    setBusy(false)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    onChange(res.data)
    toast.success(consented ? "Consent cleared." : "Consent recorded.")
  }

  return (
    <div className="grid gap-2">
      <p className="section-label">Savings email consent</p>
      <p className="max-w-[62ch] text-sm text-pretty text-muted-foreground">
        Required before sending any savings email to this customer (privacy /
        NFR-03).
      </p>
      <div className="mt-1">
        <Button size="sm" variant={consented ? "outline" : "default"} onClick={onToggle} disabled={busy}>
          {busy ? <Loader2 className="animate-spin" /> : <ShieldCheck />}
          {consented ? "Withdraw consent" : "Record consent"}
        </Button>
      </div>
    </div>
  )
}

function UploadReadings({
  plant,
  parserReady,
  onChange,
}: {
  plant: SavingsPlant
  parserReady: boolean
  onChange: (plant: SavingsPlant) => void
}) {
  const [busy, setBusy] = React.useState(false)
  const uploadId = `deye-${plant.id}`

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setBusy(true)
    const contents = await file.text()
    const res = await uploadReadings({ plantId: plant.id, filename: file.name, contents })
    setBusy(false)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    toast.success(`Imported ${res.data.length} month(s).`)
    // Readings live in their own collection; the plant summary is unchanged, but
    // re-emit it so the parent can refresh any derived view later.
    onChange(plant)
  }

  return (
    <div className="grid gap-2">
      <p className="section-label">Monthly Deye export</p>
      {parserReady ? (
        <p className="max-w-[62ch] text-sm text-pretty text-muted-foreground">
          Upload the monthly CSV or XLSX export from Solarman for this plant.
        </p>
      ) : (
        <div className="flex gap-3 rounded-lg bg-info-soft/60 p-3.5 ring-1 ring-info/20">
          <Wrench className="mt-0.5 size-4 shrink-0 text-info" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-medium text-info">Parser not configured yet</p>
            <p className="mt-1 max-w-[62ch] text-sm text-pretty text-muted-foreground">
              Upload stays disabled until the Deye export parser is configured
              from two real sample files. The rest of the flow is wired
              end-to-end — only the parser remains.
            </p>
          </div>
        </div>
      )}
      <div className="mt-1">
        {/* Visually hidden but still in the a11y tree; the button below opens the
            OS picker, so both pointer and keyboard reach the same input. */}
        <input
          id={uploadId}
          type="file"
          accept=".csv,.xlsx,text/csv"
          className="sr-only"
          onChange={onPick}
          disabled={busy || !parserReady}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy || !parserReady}
          onClick={() => document.getElementById(uploadId)?.click()}
        >
          {busy ? <Loader2 className="animate-spin" /> : <Upload />}
          Upload export
        </Button>
      </div>
    </div>
  )
}

function DeletePlant({
  plant,
  onDeleted,
}: {
  plant: SavingsPlant
  onDeleted: (id: string) => void
}) {
  const [confirming, setConfirming] = React.useState(false)
  const [busy, setBusy] = React.useState(false)

  async function onDelete() {
    setBusy(true)
    const res = await removePlant({ id: plant.id })
    setBusy(false)
    if (!res.ok) {
      toast.error(res.error)
      return
    }
    setConfirming(false)
    toast.success("Plant link deleted.")
    onDeleted(plant.id)
  }

  return (
    <div className="flex items-center justify-between gap-3 border-t pt-4">
      <p className="text-sm text-muted-foreground">
        Deleting removes the link and every reading imported for it.
      </p>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => setConfirming(true)}
        className="text-destructive hover:text-destructive"
      >
        <Trash2 /> Delete plant link
      </Button>

      <DeleteConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Delete this plant link?"
        description={`Delete the plant link for ${plant.customerName || plant.customerEmail} (${plant.plantRef}) and its readings? This cannot be undone.`}
        busy={busy}
        onConfirm={onDelete}
      />
    </div>
  )
}
