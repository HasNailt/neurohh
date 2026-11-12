/**
 * Postgres access for auth and the app.
 *
 * The VPS path to Supabase's transaction pooler (port 6543) drops idle
 * sockets with `read ETIMEDOUT`. A long-lived `pg.Pool` then hangs the next
 * page. Default: one `pg.Client` per query, closed as soon as it finishes.
 * Same pattern as a manual client that connects in about half a second.
 *
 * `DB_CONNECTION_MODE=unstable` or `VPS_MODE=1` selects this mode (also the
 * default). `PG_POOL=1` or `DB_CONNECTION_MODE=pool` restores a shared pool.
 */
import pg from "pg";
import { postgresPoolConfig, prefersFreshConnections, resolveDatabaseUrl } from "./database-url.mjs";

/** @type {any} */
const globalRef = globalThis;

const CONNECT_MS = 8_000;
const QUERY_MS = 20_000;

/**
 * @typedef {import("pg").Client & { __destroyed?: boolean, release?: (err?: unknown) => void }} LiveClient
 */

/** @param {unknown} err */
export function isTransientDbError(err) {
  const code = String(/** @type {{ code?: string }} */ (err)?.code || "");
  const message = String(/** @type {{ message?: string }} */ (err)?.message || err || "");
  if (
    code === "ETIMEDOUT" ||
    code === "ECONNRESET" ||
    code === "ECONNREFUSED" ||
    code === "EPIPE" ||
    code === "ENETUNREACH" ||
    code === "EAI_AGAIN" ||
    code === "EHOSTUNREACH" ||
    code === "ESOCKET" ||
    code === "ECONNABORTED" ||
    code === "08000" ||
    code === "08001" ||
    code === "08003" ||
    code === "08004" ||
    code === "08006" ||
    code === "08007" ||
    code === "57P01" ||
    code === "57P02" ||
    code === "57P03" ||
    code === "53300"
  ) {
    return true;
  }
  return /timeout exceeded when trying to connect|Query read timeout|Connection terminated|socket hang up|read ETIMEDOUT|connect ETIMEDOUT|Connection ended unexpectedly|server closed the connection|Client has encountered a connection error|not queryable|too many clients|remaining connection slots|ECONNRESET/i.test(
    message,
  );
}

/** @param {string | undefined} connectionString */
export function describeDbTarget(connectionString) {
  if (!connectionString) return "unset";
  try {
    const url = new URL(connectionString);
    return `${url.hostname}:${url.port || "5432"}`;
  } catch {
    return "unparsed";
  }
}

/** @param {LiveClient | null | undefined} client */
function destroyClient(client) {
  if (!client || client.__destroyed) return;
  client.__destroyed = true;
  try {
    const stream = client.connection?.stream;
    if (stream && !stream.destroyed) stream.destroy();
  } catch {
    // Already gone.
  }
  try {
    void Promise.resolve(/** @type {Promise<void> | void} */ (client.end())).catch(() => {});
  } catch {
    // end() after a destroyed stream can throw.
  }
}

/**
 * @param {(text: string, values?: unknown[]) => Promise<import("pg").QueryResult>} run
 * @param {LiveClient} client
 * @param {string} text
 * @param {unknown[] | undefined} values
 */
function queryWithin(run, client, text, values, ms = QUERY_MS) {
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer;
  const pending = run(text, values);
  pending.catch(() => {});
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const error = /** @type {Error & { code?: string }} */ (new Error("Query read timeout"));
      error.code = "ETIMEDOUT";
      destroyClient(client);
      reject(error);
    }, ms);
    if (typeof timer.unref === "function") timer.unref();
  });
  return Promise.race([pending, timeout]).finally(() => clearTimeout(timer));
}

/**
 * @param {ReturnType<typeof postgresPoolConfig>} config
 */
function clientOptions(config) {
  return {
    connectionString: config.connectionString,
    ssl: config.ssl,
    application_name: config.application_name || "adoptai",
    connectionTimeoutMillis: CONNECT_MS,
    query_timeout: QUERY_MS,
    keepAlive: false,
  };
}

/**
 * Pool-shaped object (`connect`, `query`, `end`) that never keeps an idle
 * connection. Each checkout is a new `pg.Client`.
 *
 * @param {ReturnType<typeof postgresPoolConfig>} config
 */
export function createFreshPool(config) {
  const target = describeDbTarget(config.connectionString);
  let loggedOpen = false;

  async function openClient() {
    const client = /** @type {LiveClient} */ (new pg.Client(clientOptions(config)));
    client.on("error", (err) => {
      if (client.__destroyed) return;
      console.error(`[db] ${target} socket error:`, /** @type {{ code?: string }} */ (err)?.code || "", err?.message || err);
      destroyClient(client);
    });
    const started = Date.now();
    try {
      await client.connect();
    } catch (err) {
      destroyClient(client);
      const error = /** @type {{ code?: string, message?: string }} */ (err);
      console.error(
        `[db] ${target} connect failed in ${Date.now() - started}ms:`,
        error?.code || "",
        error?.message || err,
      );
      throw err;
    }
    if (!loggedOpen) {
      loggedOpen = true;
      console.log(`[db] ${target} connected in ${Date.now() - started}ms (new client per query, no idle pool)`);
    }
    return client;
  }

  return {
    async connect() {
      let lastError;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const client = await openClient();
          let released = false;
          client.release = (err) => {
            if (released) return;
            released = true;
            if (err) {
              const error = /** @type {{ code?: string, message?: string }} */ (err);
              console.error(`[db] ${target} connection closed:`, error?.code || "", error?.message || err);
            }
            destroyClient(client);
          };
          const rawQuery = client.query.bind(client);
          const wrapped = /** @type {any} */ (client);
          wrapped.query = (/** @type {any} */ text, /** @type {any} */ values) => {
            if (typeof text !== "string") return rawQuery(text, values);
            return queryWithin(rawQuery, client, text, values);
          };
          return client;
        } catch (err) {
          lastError = err;
          if (attempt === 0 && isTransientDbError(err)) {
            console.error(`[db] ${target} connect retry`);
            continue;
          }
          throw err;
        }
      }
      throw lastError;
    },

    /**
     * @param {string} text
     * @param {unknown[]=} values
     */
    async query(text, values) {
      let lastError;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        /** @type {LiveClient | null} */
        let client = null;
        try {
          client = await openClient();
          const run = client.query.bind(client);
          const result = await queryWithin(run, client, text, values);
          destroyClient(client);
          return result;
        } catch (err) {
          if (client) destroyClient(client);
          lastError = err;
          const error = /** @type {{ code?: string, message?: string }} */ (err);
          const preview = String(text || "").replace(/\s+/g, " ").slice(0, 140);
          console.error(`[db] ${target} query failed:`, error?.code || "", error?.message || err, "|", preview);
          if (attempt === 0 && isTransientDbError(err)) {
            console.error(`[db] ${target} query retry`);
            continue;
          }
          throw err;
        }
      }
      throw lastError;
    },

    /** @param {string} _event @param {Function} [_fn] */
    on(_event, _fn) {
      return this;
    },

    async end() {},
  };
}

function createLongPool(/** @type {ReturnType<typeof postgresPoolConfig>} */ config) {
  const pool = new pg.Pool(config);
  pool.on("error", (err) => {
    console.error("[db] idle connection dropped:", err?.message || err);
  });
  return pool;
}

export function getSharedPool() {
  if (globalRef.__appPgPool) return globalRef.__appPgPool;
  const url = resolveDatabaseUrl();
  if (!url) throw new Error("Postgres URL is not configured");
  const config = postgresPoolConfig(url, 1);
  const fresh = prefersFreshConnections();
  const target = describeDbTarget(config.connectionString);
  console.log(`[db] ${target} mode=${fresh ? "unstable" : "pool"}`);
  const pool = fresh ? createFreshPool(config) : createLongPool(config);
  globalRef.__appPgPool = pool;
  return pool;
}
