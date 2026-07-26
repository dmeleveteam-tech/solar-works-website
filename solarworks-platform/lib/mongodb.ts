import "server-only"
import "./dns-fix"
import { MongoClient, type Db } from "mongodb"

import { env } from "./env"

/**
 * A single MongoClient shared across the app. The driver connects lazily on the
 * first operation, so we don't await here. In dev we stash the client on
 * `globalThis` to survive Next's hot-reload module re-evaluation and avoid
 * exhausting connections.
 */
const globalForMongo = globalThis as unknown as {
  __swMongoClient?: MongoClient
}

const client =
  globalForMongo.__swMongoClient ??
  new MongoClient(env.MONGODB_URI, {
    tls: true,
    // Serverless functions reuse warm containers across invocations; keeping
    // idle sockets around risks resuming a stale TLS session against Atlas,
    // which surfaces as MongoServerSelectionError: ssl3_read_bytes.
    maxIdleTimeMS: 10_000,
  })

if (process.env.NODE_ENV !== "production") {
  globalForMongo.__swMongoClient = client
}

export const mongoClient = client
export const db: Db = client.db(env.MONGODB_DB)
