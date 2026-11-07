/**
 * One Postgres client per server instance, shared by auth and the app.
 *
 * Supabase session mode (port 5432) allows about 15 clients and then returns
 * EMAXCONNSESSION. The URL stays on the transaction pooler (6543). Idle
 * clients are dropped so a Vercel isolate does not hold a slot.
 */
import pg from "pg";
import { postgresPoolConfig, resolveDatabaseUrl } from "./database-url.mjs";

/** @type {any} */
const globalRef = globalThis;

export function getSharedPool() {
  if (globalRef.__appPgPool) return globalRef.__appPgPool;
  const url = resolveDatabaseUrl();
  if (!url) throw new Error("Postgres URL is not configured");
  const pool = new pg.Pool(postgresPoolConfig(url, 1));
  pool.on("error", (err) => {
    console.error("[db] idle connection dropped:", err?.message || err);
  });
  globalRef.__appPgPool = pool;
  return pool;
}