import { PageHeading } from "@/components/app-shell"
import { SavingsManager } from "@/components/savings/savings-manager"
import { requireRole } from "@/lib/session"
import { listTariffs, listSavingsPlants } from "@/lib/savings"
import { PARSER_CONFIGURED } from "@/lib/savings-parser"
import { db } from "@/lib/mongodb"

export const metadata = { title: "Savings tracker" }

async function listCustomers() {
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

export default async function SavingsPage() {
  const session = await requireRole("staff", "superadmin")
  const [tariffs, plants, customers] = await Promise.all([
    listTariffs(),
    listSavingsPlants(),
    listCustomers(),
  ])

  return (
    <>
      <PageHeading
        eyebrow="Customer savings"
        title="Savings tracker"
        description="Maintain utility tariffs and link customers to their Deye plant. Upload becomes available once the export parser is configured."
      />
      <SavingsManager
        initialTariffs={tariffs}
        initialPlants={plants}
        customers={customers}
        canDelete={session.user.role === "superadmin"}
        parserReady={PARSER_CONFIGURED}
      />
    </>
  )
}
