import { PageHeading } from "@/components/app-shell"
import { SavingsManager } from "@/components/savings/savings-manager"
import { requireRole } from "@/lib/session"
import { listTariffs, listSavingsPlants } from "@/lib/savings"
import { PARSER_CONFIGURED } from "@/lib/savings-parser"

export const metadata = { title: "Savings tracker" }

export default async function SavingsPage() {
  const session = await requireRole("staff", "superadmin")
  const [tariffs, plants] = await Promise.all([listTariffs(), listSavingsPlants()])

  return (
    <>
      <PageHeading
        title="Savings tracker"
        description="Maintain utility tariffs and link customers to their Deye plant. Upload becomes available once the export parser is configured."
      />
      <SavingsManager
        initialTariffs={tariffs}
        initialPlants={plants}
        canDelete={session.user.role === "superadmin"}
        parserReady={PARSER_CONFIGURED}
      />
    </>
  )
}
