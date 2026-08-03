"use client"

import * as React from "react"
import { Loader2, UserPlus, Search, Ban, RotateCcw, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { authClient, useSession } from "@/lib/auth-client"
import { ROLES, isRole, type Role } from "@/lib/permissions"
import { ROLE_LABEL } from "@/components/role-badge"
import { cn } from "@/lib/utils"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"

type AdminUser = {
  id: string
  name?: string | null
  email: string
  role?: string | null
  banned?: boolean | null
  createdAt?: string | Date
}

function RoleSelect({
  value,
  onChange,
  disabled,
  id,
  name,
}: {
  value: Role
  onChange?: (role: Role) => void
  disabled?: boolean
  id?: string
  name?: string
}) {
  return (
    <select
      id={id}
      name={name}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange?.(e.target.value as Role)}
      className={cn(
        "h-9 rounded-md border border-input bg-transparent px-2.5 text-sm shadow-xs outline-none",
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
        "disabled:pointer-events-none disabled:opacity-50",
      )}
    >
      {ROLES.map((r) => (
        <option key={r} value={r}>
          {ROLE_LABEL[r]}
        </option>
      ))}
    </select>
  )
}

export function UsersManager() {
  const { data: session } = useSession()
  const currentUserId = session?.user.id

  const [users, setUsers] = React.useState<AdminUser[]>([])
  const [total, setTotal] = React.useState(0)
  const [loading, setLoading] = React.useState(true)
  const [search, setSearch] = React.useState("")
  const [busyId, setBusyId] = React.useState<string | null>(null)

  // Create-user form state.
  const [creating, setCreating] = React.useState(false)
  const [newRole, setNewRole] = React.useState<Role>("staff")
  const [deleteTarget, setDeleteTarget] = React.useState<AdminUser | null>(null)

  const load = React.useCallback(async (searchValue?: string) => {
    const { data, error } = await authClient.admin.listUsers({
      query: {
        limit: 100,
        sortBy: "createdAt",
        sortDirection: "desc",
        ...(searchValue
          ? { searchField: "email" as const, searchValue }
          : {}),
      },
    })
    setLoading(false)
    if (error) {
      toast.error(error.message ?? "Could not load users.")
      return
    }
    setUsers((data?.users as AdminUser[]) ?? [])
    setTotal(data?.total ?? 0)
  }, [])

  // Re-fetch in response to a user action (search, refresh, post-mutation),
  // showing the spinner. The initial `loading` state covers the mount fetch,
  // so the effect below calls `load` without synchronously setting state.
  const refresh = React.useCallback(
    (searchValue?: string) => {
      setLoading(true)
      void load(searchValue)
    },
    [load],
  )

  React.useEffect(() => {
    void (async () => {
      await load()
    })()
  }, [load])

  async function onCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const fd = new FormData(form)
    const name = String(fd.get("name") ?? "").trim()
    const email = String(fd.get("email") ?? "").trim()
    const password = String(fd.get("password") ?? "")

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.")
      return
    }

    setCreating(true)
    const { error } = await authClient.admin.createUser({
      name,
      email,
      password,
      role: newRole,
    })
    setCreating(false)
    if (error) {
      toast.error(error.message ?? "Could not create user.")
      return
    }
    toast.success(`Created ${email}`)
    form.reset()
    setNewRole("staff")
    refresh(search || undefined)
  }

  async function onSetRole(user: AdminUser, role: Role) {
    setBusyId(user.id)
    const { error } = await authClient.admin.setRole({ userId: user.id, role })
    setBusyId(null)
    if (error) {
      toast.error(error.message ?? "Could not change role.")
      refresh(search || undefined)
      return
    }
    toast.success(`${user.email} is now ${ROLE_LABEL[role]}`)
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, role } : u)),
    )
  }

  async function onToggleBan(user: AdminUser) {
    setBusyId(user.id)
    const { error } = user.banned
      ? await authClient.admin.unbanUser({ userId: user.id })
      : await authClient.admin.banUser({ userId: user.id })
    setBusyId(null)
    if (error) {
      toast.error(error.message ?? "Could not update access.")
      return
    }
    toast.success(user.banned ? `Unbanned ${user.email}` : `Banned ${user.email}`)
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, banned: !u.banned } : u)),
    )
  }

  async function confirmRemove() {
    if (!deleteTarget) return
    const user = deleteTarget
    setBusyId(user.id)
    const { error } = await authClient.admin.removeUser({ userId: user.id })
    setBusyId(null)
    if (error) {
      toast.error(error.message ?? "Could not delete user.")
      return
    }
    toast.success(`Deleted ${user.email}`)
    setUsers((prev) => prev.filter((u) => u.id !== user.id))
    setTotal((t) => Math.max(0, t - 1))
    setDeleteTarget(null)
  }

  return (
    <div className="grid gap-6">
      {/* Create user */}
      <Card>
        <CardContent>
          <form onSubmit={onCreate} className="grid gap-4 md:grid-cols-[1fr_1fr_1fr_auto_auto] md:items-end">
            <div className="grid gap-1.5">
              <Label htmlFor="new-name">Name</Label>
              <Input id="new-name" name="name" required placeholder="Maria Santos" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="new-email">Email</Label>
              <Input id="new-email" name="email" type="email" required placeholder="maria@solarworks.ph" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="new-password">Temp password</Label>
              <Input id="new-password" name="password" type="password" required minLength={8} placeholder="≥ 8 characters" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="new-role">Role</Label>
              <RoleSelect id="new-role" value={newRole} onChange={setNewRole} />
            </div>
            <Button type="submit" disabled={creating}>
              {creating ? <Loader2 className="animate-spin" /> : <UserPlus />}
              Create
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Search + list */}
      <div className="flex items-center gap-2">
        <div className="relative max-w-xs flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") refresh(search || undefined)
            }}
            placeholder="Search by email…"
            className="pl-8"
          />
        </div>
        <Button variant="outline" onClick={() => refresh(search || undefined)} disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : "Search"}
        </Button>
        <span className="ml-auto text-sm text-muted-foreground">{total} users</span>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading && users.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <Loader2 className="mx-auto size-5 animate-spin" />
            </div>
          ) : users.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No users yet. Create one above, or run the superadmin seed script.
            </div>
          ) : (
            <div className="divide-y">
              {users.map((user) => {
                const role: Role = isRole(user.role) ? user.role : "customer"
                const isSelf = user.id === currentUserId
                const busy = busyId === user.id
                return (
                  <div
                    key={user.id}
                    className="flex flex-wrap items-center gap-3 px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 truncate font-medium">
                        {user.name || "—"}
                        {user.banned ? (
                          <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                            Banned
                          </span>
                        ) : null}
                        {isSelf ? (
                          <span className="text-xs text-muted-foreground">(you)</span>
                        ) : null}
                      </div>
                      <div className="truncate text-sm text-muted-foreground">
                        {user.email}
                      </div>
                    </div>

                    <RoleSelect
                      value={role}
                      disabled={busy || isSelf}
                      onChange={(r) => onSetRole(user, r)}
                    />

                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy || isSelf}
                      onClick={() => onToggleBan(user)}
                    >
                      {busy ? (
                        <Loader2 className="animate-spin" />
                      ) : user.banned ? (
                        <RotateCcw />
                      ) : (
                        <Ban />
                      )}
                      <span className="hidden sm:inline">
                        {user.banned ? "Unban" : "Ban"}
                      </span>
                    </Button>

                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={busy || isSelf}
                      onClick={() => setDeleteTarget(user)}
                    >
                      <Trash2 />
                      <span className="hidden sm:inline">Delete</span>
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <DeleteConfirmDialog
        open={deleteTarget != null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this user?"
        description={
          deleteTarget
            ? `Permanently delete ${deleteTarget.email}? This cannot be undone.`
            : ""
        }
        busy={deleteTarget != null && busyId === deleteTarget.id}
        onConfirm={confirmRemove}
      />
    </div>
  )
}
