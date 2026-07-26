"use server"

import { revalidatePath } from "next/cache"
import { ObjectId } from "mongodb"
import { z } from "zod"

import { requireRole } from "@/lib/session"
import { db } from "@/lib/mongodb"
import { notify } from "@/lib/notifications"
import { createCustomerAccount } from "@/lib/customer-accounts"
import { parseDeyeExport } from "@/lib/savings-parser"
import {
  listTariffs,
  upsertTariff,
  deleteTariff,
  listSavingsPlants,
  getSavingsPlant,
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
  ActionResult<{ tariffs: Tariff[]; plants: SavingsPlant[]; customers: LinkableCustomer[] }>
> {
  await requireRole(...STAFF_ROLES)
  const [tariffs, plants, customers] = await Promise.all([
    listTariffs(),
    listSavingsPlants(),
    listCustomers(),
  ])
  return { ok: true, data: { tariffs, plants, customers } }
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

const createPlantSchema = z.intersection(
  z.object({
    plantRef: z.string().trim().min(1, "Plant reference is required").max(120),
    provider: z.string().trim().min(1, "Provider is required").max(80),
  }),
  z.discriminatedUnion("mode", [
    z.object({ mode: z.literal("existing"), customerUserId: objectId }),
    z.object({
      mode: z.literal("new"),
      name: z.string().trim().min(1, "Customer name is required").max(120),
      email: z.string().trim().email("Invalid email").max(200),
      password: z.string().min(8, "Password must be at least 8 characters").max(200),
    }),
  ]),
)

export async function createPlant(
  input: z.input<typeof createPlantSchema>,
): Promise<ActionResult<SavingsPlant>> {
  await requireRole(...STAFF_ROLES)
  const parsed = createPlantSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid plant link." }
  }
  const v = parsed.data

  let customerUserId: string
  let customerName: string
  let customerEmail: string

  if (v.mode === "new") {
    const created = await createCustomerAccount({
      name: v.name,
      email: v.email,
      password: v.password,
    })
    if (!created.ok) return { ok: false, error: created.error }
    customerUserId = created.userId
    customerName = v.name
    customerEmail = v.email.trim().toLowerCase()
  } else {
    const user = await db
      .collection("user")
      .findOne(
        { _id: new ObjectId(v.customerUserId), role: "customer" },
        { projection: { name: 1, email: 1 } },
      )
    if (!user) return { ok: false, error: "That account isn't a customer." }
    customerUserId = v.customerUserId
    customerName = (user.name as string | undefined) ?? ""
    customerEmail = (user.email as string | undefined) ?? ""
  }

  const plant = await insertSavingsPlant({
    customerUserId,
    customerName,
    customerEmail,
    plantRef: v.plantRef,
    provider: v.provider,
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
  const session = await requireRole(...STAFF_ROLES)
  const parsed = uploadSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid upload." }
  }
  const { plantId, filename, contents } = parsed.data

  const result = parseDeyeExport(new TextEncoder().encode(contents), filename)
  if (!result.ok) return { ok: false, error: result.error }

  const readings = await saveReadingsForPlant(plantId, result.rows)

  // Tell the customer their figures moved. A missing plant link is impossible
  // here (the save above would have failed), but it stays a soft skip.
  const plant = await getSavingsPlant(plantId)
  if (plant) {
    await notify({
      userId: plant.customerUserId,
      type: "savings_updated",
      title: "Your savings figures were updated",
      body: `${readings.length} month${readings.length === 1 ? "" : "s"} of data for ${plant.plantRef}`,
      href: "/portal",
      actorId: session.user.id,
    })
  }

  revalidatePath("/dashboard/savings")
  return { ok: true, data: readings }
}

// --- helpers ----------------------------------------------------------------

export type LinkableCustomer = { id: string; name: string; email: string }

async function listCustomers(): Promise<LinkableCustomer[]> {
  const docs = await db
    .collection("user")
    .find({ role: "customer" }, { projection: { name: 1, email: 1 } })
    .sort({ name: 1 })
    .toArray()
  return docs.map((d) => ({
    id: String(d._id),
    name: (d.name as string | undefined) ?? "",
    email: (d.email as string | undefined) ?? "",
  }))
}
