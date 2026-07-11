import "server-only"
import { ObjectId, type Collection } from "mongodb"

import { db } from "./mongodb"
import type { Tariff, SavingsPlant, MonthlyReading } from "./savings-shared"

/**
 * Solar Savings Tracker data layer (Phase 2b scaffolding). Three collections:
 *   - `savingsTariffs`  — admin-maintained ₱/kWh rate per utility provider.
 *   - `savingsPlants`   — links a customer account to their Deye plant + provider.
 *   - `savingsReadings` — monthly generation rows parsed from Deye exports.
 *
 * Client-safe types/maths live in `./savings-shared`. This MVP is built ahead of
 * the real Deye files; persistence is real, but the parser that fills
 * `savingsReadings` is stubbed (see `./savings-parser`).
 */
export * from "./savings-shared"

// --- tariffs ----------------------------------------------------------------

type TariffDoc = {
  _id: ObjectId
  provider: string
  ratePerKwh: number
  updatedAt: Date
}

export function tariffsCollection(): Collection<TariffDoc> {
  return db.collection<TariffDoc>("savingsTariffs")
}

function serializeTariff(doc: TariffDoc): Tariff {
  return {
    id: doc._id.toString(),
    provider: doc.provider,
    ratePerKwh: doc.ratePerKwh,
    updatedAt: doc.updatedAt.toISOString(),
  }
}

/** All tariffs, alphabetical by provider. */
export async function listTariffs(): Promise<Tariff[]> {
  const docs = await tariffsCollection().find().sort({ provider: 1 }).toArray()
  return docs.map(serializeTariff)
}

/**
 * Create or update the rate for a provider (provider name is the natural key, so
 * a re-add edits rather than duplicates).
 */
export async function upsertTariff(
  provider: string,
  ratePerKwh: number,
): Promise<Tariff> {
  const now = new Date()
  const result = await tariffsCollection().findOneAndUpdate(
    { provider },
    { $set: { ratePerKwh, updatedAt: now }, $setOnInsert: { provider } },
    { upsert: true, returnDocument: "after" },
  )
  // `returnDocument: after` with upsert always yields a doc.
  return serializeTariff(result as TariffDoc)
}

export async function deleteTariff(id: string): Promise<boolean> {
  const { deletedCount } = await tariffsCollection().deleteOne({
    _id: new ObjectId(id),
  })
  return deletedCount > 0
}

/** The ₱/kWh rate for a provider, or null if none is set. */
export async function tariffRateFor(provider: string): Promise<number | null> {
  const doc = await tariffsCollection().findOne({ provider })
  return doc ? doc.ratePerKwh : null
}

// --- plant links ------------------------------------------------------------

type SavingsPlantDoc = {
  _id: ObjectId
  customerUserId: string
  customerName: string
  customerEmail: string
  plantRef: string
  provider: string
  emailConsentAt: Date | null
  createdAt: Date
  updatedAt: Date
}

export function savingsPlantsCollection(): Collection<SavingsPlantDoc> {
  return db.collection<SavingsPlantDoc>("savingsPlants")
}

function serializeSavingsPlant(doc: SavingsPlantDoc): SavingsPlant {
  return {
    id: doc._id.toString(),
    customerUserId: doc.customerUserId,
    customerName: doc.customerName,
    customerEmail: doc.customerEmail,
    plantRef: doc.plantRef,
    provider: doc.provider,
    emailConsentAt: doc.emailConsentAt ? doc.emailConsentAt.toISOString() : null,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  }
}

/** Every plant link, newest first (staff/admin view). */
export async function listSavingsPlants(): Promise<SavingsPlant[]> {
  const docs = await savingsPlantsCollection()
    .find()
    .sort({ createdAt: -1 })
    .toArray()
  return docs.map(serializeSavingsPlant)
}

/** Plant links owned by a customer (always owner-scoped for portal reads). */
export async function listSavingsPlantsForCustomer(
  customerUserId: string,
): Promise<SavingsPlant[]> {
  const docs = await savingsPlantsCollection()
    .find({ customerUserId })
    .sort({ createdAt: -1 })
    .toArray()
  return docs.map(serializeSavingsPlant)
}

export type CreateSavingsPlantInput = {
  customerUserId: string
  customerName: string
  customerEmail: string
  plantRef: string
  provider: string
}

export async function insertSavingsPlant(
  input: CreateSavingsPlantInput,
): Promise<SavingsPlant> {
  const now = new Date()
  const doc: SavingsPlantDoc = {
    _id: new ObjectId(),
    customerUserId: input.customerUserId,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    plantRef: input.plantRef,
    provider: input.provider,
    emailConsentAt: null,
    createdAt: now,
    updatedAt: now,
  }
  await savingsPlantsCollection().insertOne(doc)
  return serializeSavingsPlant(doc)
}

/** Record (or clear) the customer's consent to receive savings emails. */
export async function setSavingsEmailConsent(
  id: string,
  consented: boolean,
): Promise<SavingsPlant | null> {
  const now = new Date()
  const result = await savingsPlantsCollection().findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { emailConsentAt: consented ? now : null, updatedAt: now } },
    { returnDocument: "after" },
  )
  return result ? serializeSavingsPlant(result) : null
}

export async function deleteSavingsPlant(id: string): Promise<boolean> {
  // Remove the plant link and its readings together so no orphan rows remain.
  const _id = new ObjectId(id)
  const { deletedCount } = await savingsPlantsCollection().deleteOne({ _id })
  if (deletedCount > 0) {
    await readingsCollection().deleteMany({ plantId: id })
  }
  return deletedCount > 0
}

// --- monthly readings -------------------------------------------------------

type ReadingDoc = {
  _id: ObjectId
  plantId: string
  month: string
  kwhProduced: number
  kwhSelfConsumed: number | null
  kwhExported: number | null
  createdAt: Date
}

export function readingsCollection(): Collection<ReadingDoc> {
  return db.collection<ReadingDoc>("savingsReadings")
}

function serializeReading(doc: ReadingDoc): MonthlyReading {
  return {
    id: doc._id.toString(),
    plantId: doc.plantId,
    month: doc.month,
    kwhProduced: doc.kwhProduced,
    kwhSelfConsumed: doc.kwhSelfConsumed,
    kwhExported: doc.kwhExported,
    createdAt: doc.createdAt.toISOString(),
  }
}

/** Readings for a plant, oldest month first. */
export async function listReadingsForPlant(
  plantId: string,
): Promise<MonthlyReading[]> {
  const docs = await readingsCollection()
    .find({ plantId })
    .sort({ month: 1 })
    .toArray()
  return docs.map(serializeReading)
}

export type UpsertReadingInput = Pick<
  MonthlyReading,
  "month" | "kwhProduced" | "kwhSelfConsumed" | "kwhExported"
>

/**
 * Insert or replace parsed month rows for a plant. Upserts on (plantId, month)
 * so re-uploading a corrected export refreshes the month rather than duplicating
 * it. Returns the full, refreshed reading set for the plant.
 */
export async function saveReadingsForPlant(
  plantId: string,
  rows: UpsertReadingInput[],
): Promise<MonthlyReading[]> {
  if (rows.length > 0) {
    const now = new Date()
    await readingsCollection().bulkWrite(
      rows.map((row) => ({
        updateOne: {
          filter: { plantId, month: row.month },
          update: {
            $set: {
              kwhProduced: row.kwhProduced,
              kwhSelfConsumed: row.kwhSelfConsumed,
              kwhExported: row.kwhExported,
            },
            $setOnInsert: { plantId, month: row.month, createdAt: now },
          },
          upsert: true,
        },
      })),
    )
  }
  return listReadingsForPlant(plantId)
}
