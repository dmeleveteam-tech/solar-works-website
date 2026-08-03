"use server"

import { revalidatePath } from "next/cache"
import { ObjectId } from "mongodb"
import { z } from "zod"

import { requireRole } from "@/lib/session"
import { parseDeyeExport } from "@/lib/savings-parser"
import {
  listTariffs,
  upsertTariff,
  deleteTariff,
  listSavingsPlants,
  insertSavingsPlant,
  setSavingsEmailConsent,
  deleteSavingsPlant,
  listReadingsForPlant,
  saveReadingsForPlant,
  type Tariff,
  type SavingsPlant,
  type MonthlyReading,
} from "@/lib/savings"

/**
 * Server Actions for the staff Solar Savings Tracker (Phase 2b scaffolding).
 * Every action re-verifies the caller's role server-side: staff and superadmin
 * may read and manage tariffs/plant links; deletion is superadmin-only. Mirrors
 * the customer-projects actions and the `savings` permissions in
 * `lib/permissions.ts`.
 */

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string }

const STAFF_ROLES = ["staff", "superadmin"] as const

const objectId = z.string().refine((v) => ObjectId.isValid(v), "Invalid id")

// --- tariffs ----------------------------------------------------------------

const tariffSchema = z.object({
  provider: z.string().trim().min(1, "Provider is required").max(80),
  ratePerKwh: z
    .number({ message: "Rate must be a number" })
    .positive("Rate must be greater than 0")
    .max(1000, "Rate looks too high"),
})

export async function getSavingsData(): Promise<
  ActionResult<{ tariffs: Tariff[]; plants: SavingsPlant[] }>
> {
  await requireRole(...STAFF_ROLES)
  const [tariffs, plants] = await Promise.all([listTariffs(), listSavingsPlants()])
  return { ok: true, data: { tariffs, plants } }
}

export async function saveTariff(
  input: z.input<typeof tariffSchema>,
): Promise<ActionResult<Tariff>> {
  await requireRole(...STAFF_ROLES)
  const parsed = tariffSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid tariff." }
  }
  const { provider, ratePerKwh } = parsed.data
  const tariff = await upsertTariff(provider, ratePerKwh)
  revalidatePath("/dashboard/savings")
  return { ok: true, data: tariff }
}

export async function removeTariff(input: { id: string }): Promise<ActionResult> {
  // Deletion is destructive — superadmin only.
  await requireRole("superadmin")
  const parsed = objectId.safeParse(input.id)
  if (!parsed.success) return { ok: false, error: "Invalid id." }
  const deleted = await deleteTariff(parsed.data)
  if (!deleted) return { ok: false, error: "Tariff not found." }
  revalidatePath("/dashboard/savings")
  return { ok: true, data: undefined }
}

// --- plant links ------------------------------------------------------------

const createPlantSchema = z.object({
  customerName: z.string().trim().min(1, "Customer name is required").max(120),
  customerEmail: z.string().trim().email("Invalid email").max(200),
  plantRef: z.string().trim().min(1, "Plant reference is required").max(120),
  provider: z.string().trim().min(1, "Provider is required").max(80),
})

export async function createPlant(
  input: z.input<typeof createPlantSchema>,
): Promise<ActionResult<SavingsPlant>> {
  await requireRole(...STAFF_ROLES)
  const parsed = createPlantSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid plant link." }
  }
  const { customerName, customerEmail, plantRef, provider } = parsed.data

  const plant = await insertSavingsPlant({
    customerName,
    customerEmail: customerEmail.trim().toLowerCase(),
    plantRef,
    provider,
  })
  revalidatePath("/dashboard/savings")
  return { ok: true, data: plant }
}

const consentSchema = z.object({ id: objectId, consented: z.boolean() })

export async function setConsent(
  input: z.input<typeof consentSchema>,
): Promise<ActionResult<SavingsPlant>> {
  await requireRole(...STAFF_ROLES)
  const parsed = consentSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Invalid request." }
  const plant = await setSavingsEmailConsent(parsed.data.id, parsed.data.consented)
  if (!plant) return { ok: false, error: "Plant link not found." }
  revalidatePath("/dashboard/savings")
  return { ok: true, data: plant }
}

export async function removePlant(input: { id: string }): Promise<ActionResult> {
  // Deletion is destructive — superadmin only.
  await requireRole("superadmin")
  const parsed = objectId.safeParse(input.id)
  if (!parsed.success) return { ok: false, error: "Invalid id." }
  const deleted = await deleteSavingsPlant(parsed.data)
  if (!deleted) return { ok: false, error: "Plant link not found." }
  revalidatePath("/dashboard/savings")
  return { ok: true, data: undefined }
}

export async function getReadings(input: {
  plantId: string
}): Promise<ActionResult<MonthlyReading[]>> {
  await requireRole(...STAFF_ROLES)
  const parsed = objectId.safeParse(input.plantId)
  if (!parsed.success) return { ok: false, error: "Invalid id." }
  return { ok: true, data: await listReadingsForPlant(parsed.data) }
}

// --- upload + parse (stubbed parser) ----------------------------------------

const uploadSchema = z.object({
  plantId: objectId,
  filename: z.string().trim().min(1).max(260),
  // Raw file text. The real parser will branch CSV vs XLSX on the filename.
  contents: z.string().max(5_000_000),
})

/**
 * Upload a Deye monthly export and store its month rows for a plant. The parser
 * is a stub until real sample files exist, so this currently returns the
 * not-configured message; the action is wired end-to-end so finishing the parser
 * is the only remaining step.
 */
export async function uploadReadings(
  input: z.input<typeof uploadSchema>,
): Promise<ActionResult<MonthlyReading[]>> {
  await requireRole(...STAFF_ROLES)
  const parsed = uploadSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid upload." }
  }
  const { plantId, filename, contents } = parsed.data

  const result = parseDeyeExport(new TextEncoder().encode(contents), filename)
  if (!result.ok) return { ok: false, error: result.error }

  const readings = await saveReadingsForPlant(plantId, result.rows)

  revalidatePath("/dashboard/savings")
  return { ok: true, data: readings }
}
