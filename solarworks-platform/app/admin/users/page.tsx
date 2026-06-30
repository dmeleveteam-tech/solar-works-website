import { PageHeading } from "@/components/app-shell"
import { UsersManager } from "@/components/admin/users-manager"

export const metadata = { title: "Users" }

export default function AdminUsersPage() {
  return (
    <>
      <PageHeading
        title="Users"
        description="Create accounts, assign roles, and manage access."
      />
      <UsersManager />
    </>
  )
}
