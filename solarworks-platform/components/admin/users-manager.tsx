"use client"

import * as React from "react"
import {
  Ban,
  Loader2,
  RotateCcw,
  Search,
  Trash2,
  UserPlus,
  Users,
  X,
} from "lucide-react"
import { toast } from "sonner"

import { authClient, useSession } from "@/lib/auth-client"
import { ROLES, isRole, type Role } from "@/lib/permissions"
import { ROLE_LABEL, RoleBadge } from "@/components/role-badge"
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"
import { Input } from "@/components/ui/input"
import { PasswordInput } from "@/components/ui/password-input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { SkeletonRows } from "@/components/ui/skeleton"

type AdminUser = {
  id: string
  name?: string | null
  email: string
  role?: string | null
  banned?: boolean | null
  createdAt?: string | Date
}

// One column template shared by the header and every row, so the role control
// and the actions line up down the list instead of each row measuring itself.
const ROW_GRID =
  "md:grid md:grid-cols-[minmax(0,1fr)_11rem_auto] md:items-center md:gap-4"

function RoleSelect({
  value,
  onChange,
  disabled,
  id,
  name,
  "aria-label": ariaLabel,
}: {
  value: Role
  onChange?: (role: Role) => void
  disabled?: boolean
  id?: string
  name?: string
  "aria-label"?: string
}) {
  return (
    <Select
      id={id}
      name={name}
      value={value}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={(e) => onChange?.(e.target.value as Role)}
    >
      {ROLES.map((r) => (
        <option key={r} value={r}>
          {ROLE_LABEL[r]}
        </option>
      ))}
    </Select>
  )
}

/** Up to two initials from the user's name, falling back to the email. */
function initials(user: AdminUser): string {
  const source = user.name?.trim() || user.email
  const parts = source.split(/\s+/).filter(Boolean)
  const letters =
    parts.length > 1
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`
      : source.slice(0, 2)
  return letters.toUpperCase()
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
  const [showCreate, setShowCreate] = React.useState(false)
  const [creating, setCreating] = React.useState(false)
  const [newRole, setNewRole] = React.useState<Role>("staff")
  const nameRef = React.useRef<HTMLInputElement>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<AdminUser | null>(null)

  // Opening the panel puts the caret in the first field — the button and the
  // form are far enough apart vertically that a mouse-only reveal is a jump.
  React.useEffect(() => {
    if (showCreate) nameRef.current?.focus()
  }, [showCreate])

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
    setShowCreate(false)
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
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs sm:w-auto sm:flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") refresh(search || undefined)
            }}
            aria-label="Search users by email"
            placeholder="Search by email…"
            className="pl-8"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => refresh(search || undefined)}
          disabled={loading}
        >
          {loading ? <Loader2 className="animate-spin" /> : null}
          Search
        </Button>
        <span className="tabular ml-auto text-sm text-muted-foreground">
          {total} users
        </span>
        <Button
          variant={showCreate ? "ghost" : "default"}
          onClick={() => setShowCreate((open) => !open)}
          aria-expanded={showCreate}
          aria-controls="create-user-panel"
        >
          {showCreate ? <X /> : <UserPlus />}
          {showCreate ? "Cancel" : "New user"}
        </Button>
      </div>

      {showCreate ? (
        <Card id="create-user-panel">
          <CardContent>
            <form onSubmit={onCreate} className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="grid gap-1.5">
                  <Label htmlFor="new-name">Name</Label>
                  <Input
                    id="new-name"
                    name="name"
                    ref={nameRef}
                    required
                    placeholder="Maria Santos"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="new-email">Email</Label>
                  <Input
                    id="new-email"
                    name="email"
                    type="email"
                    required
                    placeholder="maria@solarworks.ph"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="new-password">Temp password</Label>
                  <PasswordInput
                    id="new-password"
                    name="password"
                    required
                    minLength={8}
                    placeholder="≥ 8 characters"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="new-role">Role</Label>
                  <RoleSelect id="new-role" value={newRole} onChange={setNewRole} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button type="submit" disabled={creating}>
                  {creating ? <Loader2 className="animate-spin" /> : <UserPlus />}
                  Create
                </Button>
                <p className="text-xs text-muted-foreground">
                  The account is active immediately. Share the temporary password
                  and ask them to change it.
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="p-0">
          {loading && users.length === 0 ? (
            <SkeletonRows rows={6} />
          ) : users.length === 0 ? (
            <EmptyState
              icon={Users}
              title={search ? "No users match that email" : "No users yet"}
              description={
                search
                  ? "Clear the search to see every account."
                  : "Create the first account, or run the superadmin seed script."
              }
              action={
                <Button onClick={() => setShowCreate(true)}>
                  <UserPlus />
                  New user
                </Button>
              }
            />
          ) : (
            <>
              <div
                className={`${ROW_GRID} hidden border-b px-4 py-2.5`}
                aria-hidden
              >
                <span className="section-label">Person</span>
                <span className="section-label">Role</span>
                <span className="section-label justify-self-end">Actions</span>
              </div>

              <div className="divide-y divide-border/60">
                {users.map((user) => {
                  const role: Role = isRole(user.role) ? user.role : "customer"
                  const isSelf = user.id === currentUserId
                  const busy = busyId === user.id
                  return (
                    <div
                      key={user.id}
                      className={`${ROW_GRID} px-4 py-3.5 transition-colors hover:bg-foreground/[0.03]`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        {/* Squircle, not a circle: the round avatar is the
                            default everywhere and reads as a social profile
                            rather than a platform account. */}
                        <span
                          aria-hidden
                          className="grid size-9 shrink-0 place-items-center rounded-[0.7rem] bg-gradient-to-br from-primary to-primary-strong text-xs font-semibold text-primary-foreground"
                        >
                          {initials(user)}
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="truncate font-medium">
                              {user.name || "—"}
                            </span>
                            {isSelf ? (
                              <span className="text-xs text-muted-foreground">
                                (you)
                              </span>
                            ) : null}
                            {user.banned ? (
                              <Badge tone="danger" shape="pill" size="sm">
                                Banned
                              </Badge>
                            ) : null}
                            {/* Below md the select is hidden behind the stacked
                                layout's own control, so the role still needs to
                                be readable here. */}
                            <RoleBadge role={role} className="md:hidden" />
                          </div>
                          <div className="truncate text-sm text-muted-foreground">
                            {user.email}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 md:mt-0">
                        <RoleSelect
                          value={role}
                          disabled={busy || isSelf}
                          aria-label={`Role for ${user.email}`}
                          onChange={(r) => onSetRole(user, r)}
                        />
                      </div>

                      <div className="mt-2 flex items-center gap-1 md:mt-0 md:justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busy || isSelf}
                          aria-label={
                            user.banned
                              ? `Unban ${user.email}`
                              : `Ban ${user.email}`
                          }
                          onClick={() => onToggleBan(user)}
                        >
                          {busy ? (
                            <Loader2 className="animate-spin" />
                          ) : user.banned ? (
                            <RotateCcw />
                          ) : (
                            <Ban />
                          )}
                          <span>{user.banned ? "Unban" : "Ban"}</span>
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busy || isSelf}
                          onClick={() => setDeleteTarget(user)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 />
                          <span className="sr-only">Delete {user.email}</span>
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
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
