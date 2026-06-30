/**
 * Pure ownership-scoping helper for customer projects. Kept free of
 * `server-only`/mongodb imports so the security-critical invariant — that every
 * customer-facing read is bound to the caller's own id — can be unit-tested
 * without a database. The server data layer composes these into its queries.
 */

/** The owner-scope a customer read must always carry. */
export function customerScope(customerUserId: string): { customerUserId: string } {
  return { customerUserId }
}
