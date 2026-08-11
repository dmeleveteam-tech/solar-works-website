"use client"

import * as React from "react"
import {
  ChevronDown,
  Loader2,
  Plus,
  ShieldCheck,
  Trash2,
  Upload,
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
import { Card, CardContent } from "@/components/ui/card"

const controlClass = cn(
  "h-9 w-full rounded-md border border-input bg-transparent px-2.5 text-sm shadow-xs outline-none",
  "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
  "disabled:pointer-events-none disabled:opacity-50",
)

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
    <div className="grid gap-8">
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

/** Surfaces the still-pending "what counts as saved" decision to staff. */
function BasisNotice() {
  return (
    <Card className="border-amber-300/60 bg-amber-50/50 dark:bg-amber-950/20">
      <CardContent className="py-4 text-sm">
        <p className="font-medium">Savings basis: {SAVINGS_BASIS_LABEL[DEFAULT_SAVINGS_BASIS]} (provisional)</p>
        <p className="mt-1 text-muted-foreground">
          {SAVINGS_BASIS_DESCRIPTION[DEFAULT_SAVINGS_BASIS]} The final basis is
          pending the client&apos;s decision. Every peso figure is shown as an
          estimate.
        </p>
      </CardContent>
    </Card>
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
    <section className="grid gap-3">
      <div>
        <h2 className="font-heading text-lg font-semibold">Utility tariffs</h2>
        <p className="text-sm text-muted-foreground">
          Flat ₱/kWh rate per provider. Used to price each customer&apos;s savings.
        </p>
      </div>

      <Card>
        <CardContent className="grid gap-4 py-5">
          {tariffs.length > 0 ? (
            <ul className="grid gap-2">
              {tariffs.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center gap-3 rounded-md border px-3 py-2 text-sm"
                >
                  <span className="min-w-0 flex-1 truncate font-medium">{t.provider}</span>
                  <span className="tabular-nums">₱{t.ratePerKwh.toFixed(2)}/kWh</span>
                  {canDelete ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget(t)}
                      className="text-destructive hover:text-destructive"
                      aria-label={`Remove ${t.provider} tariff`}
                    >
                      <X />
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No tariffs yet.</p>
          )}

          <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-2">
            <div className="grid flex-1 gap-1.5">
              <Label htmlFor="provider">Provider</Label>
              <Input
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
    <section className="grid gap-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-lg font-semibold">Customer plants</h2>
          <p className="text-sm text-muted-foreground">
            Link a customer account to their Deye plant and utility provider.
          </p>
        </div>
        <Button size="sm" onClick={() => setAdding((v) => !v)}>
          {adding ? <X /> : <Plus />}
          {adding ? "Cancel" : "Link plant"}
        </Button>
      </div>

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
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No plants linked yet.
          </CardContent>
        </Card>
      ) : (
        plants.map((plant) => (
          <PlantCard
            key={plant.id}
            plant={plant}
            canDelete={canDelete}
            parserReady={parserReady}
            onChange={upsert}
            onDeleted={(id) => setPlants((prev) => prev.filter((p) => p.id !== id))}
          />
        ))
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

          {mode === "new" ? (
            <p className="text-xs text-muted-foreground">
              This creates a customer login. Share the email and temporary password with
              them; they can sign in at the portal.
            </p>
          ) : null}

          <div>
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
            <p className="truncate font-medium">
              {plant.customerName ? `${plant.customerName} · ` : ""}
              {plant.plantRef}
            </p>
            <p className="truncate text-sm text-muted-foreground">
              {plant.customerEmail} · {plant.provider}
            </p>
          </div>
          <span
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium",
              plant.emailConsentAt
                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                : "bg-muted text-muted-foreground",
            )}
          >
            {plant.emailConsentAt ? "Email consent given" : "No email consent"}
          </span>
          <ChevronDown
            className={cn("size-4 shrink-0 transition-transform", open && "rotate-180")}
          />
        </button>

        {open ? (
          <div className="mt-4 grid gap-5 border-t pt-4">
            <ConsentToggle plant={plant} onChange={onChange} />
            <UploadReadings plant={plant} parserReady={parserReady} onChange={onChange} />
            {canDelete ? <DeletePlant plant={plant} onDeleted={onDeleted} /> : null}
          </div>
        ) : null}
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
      <p className="text-sm font-medium">Savings email consent</p>
      <p className="text-sm text-muted-foreground">
        Required before sending any savings email to this customer (privacy / NFR-03).
      </p>
      <div>
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
      <p className="text-sm font-medium">Monthly Deye export</p>
      {!parserReady ? (
        <p className="rounded-md border border-dashed px-3 py-2 text-sm text-muted-foreground">
          Upload is parked until the Deye export parser is configured from two real
          sample files. The flow is wired end-to-end — only the parser remains.
        </p>
      ) : null}
      <div>
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
    toast.success("Plant link deleted.")
    onDeleted(plant.id)
  }

  return (
    <div className="border-t pt-4">
      <Button
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
        description={`Delete the plant link for ${plant.customerName} and its readings? This cannot be undone.`}
        busy={busy}
        onConfirm={onDelete}
      />
    </div>
  )
}
