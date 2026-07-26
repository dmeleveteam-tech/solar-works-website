/**
 * Local-dev DNS workaround for Atlas SRV lookups.
 *
 * Some networks (this dev machine included) refuse the `querySrv` DNS request
 * that a `mongodb+srv://…` URI needs, failing with `querySrv ECONNREFUSED`.
 * Setting `MONGODB_DNS_SERVERS` (comma-separated, e.g. "1.1.1.1,8.8.8.8") makes
 * Node resolve through those public resolvers instead, so the SRV string works
 * without switching to the non-SRV form.
 *
 * Import this side-effect module BEFORE any MongoClient connects, and AFTER env
 * vars are loaded (i.e. after `dotenv/config` in scripts). It is a no-op when
 * the var is unset — so production (Vercel, whose DNS resolves SRV fine) is
 * unaffected and never pins a resolver.
 */
import dns from "node:dns"

const raw = process.env.MONGODB_DNS_SERVERS
if (raw) {
  const servers = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  if (servers.length > 0) {
    dns.setServers(servers)
    // The callback resolver and dns.promises can hold separate server lists
    // depending on the runtime, so pin both. Without this the seed scripts pass
    // while a Next dev worker still hits querySrv ECONNREFUSED.
    dns.promises.setServers(servers)
  }
}
