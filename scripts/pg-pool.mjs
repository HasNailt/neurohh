/**
 * One Postgres pool per server instance.
 *
 * Vercel starts many isolates. Two pools of five connections each exhausted
 * the Supabase pooler; the next request waited until the gateway reset the
 * socket (~30–40s, ERR_CONNECTION_RESET). A single small pool that drops idle
 * clients avoids that leak. Auth and the app share this pool.
 */
import pg from "pg";
import { postgresPoolConfig, resolveDatabaseUrl } from "./database-url.mjs";

const globalRef = globalThis;

export function getSharedPool() {
  if (globalRef.__appPgPool) return globalRef.__appPgPool;
  const url = resolveDatabaseUrl();
  if (!url) throw new Error("Postgres URL is not configured");
  const pool = new pg.Pool(postgresPoolConfig(url, 2));
  // An idle client error is otherwise an unhandled 'error' event and kills
  // the isolate, which the browser reports as a connection reset.
  pool.on("error", (err) => {
    console.error("[db] idle connection dropped:", err?.message || err);
  });
  pool.on("connect", (client) => {
    client
      .query(
        "select set_config('statement_timeout', '10000', false), set_config('idle_in_transaction_session_timeout', '10000', false)",
      )
      .catch((err) => {
        console.error("[db] could not set statement timeout:", err?.message || err);
      });
  });
  globalRef.__appPgPool = pool;
  return pool;
}
