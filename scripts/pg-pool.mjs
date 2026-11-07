/**
 * Postgres access for auth and the app.
 *
 * Default: no long-lived pool. Each checkout is a new `pg.Client` (or one
 * returned a moment ago, still inside a short warm window). Idle sockets to
 * the Supabase transaction pooler die on a VPS with `read ETIMEDOUT`; reusing
 * them makes pages hang. Set `PG_POOL=1` to restore a shared `pg.Pool`.
 */
import pg from "pg";
import { postgresPoolConfig, prefersFreshConnections, resolveDatabaseUrl } from "./database-url.mjs";

/** @type {any} */
const globalRef = globalThis;

const CONNECT_MS = 6_000;
const QUERY_MS = 12_000;
const WARM_MS = 800;
const WARM_MAX = 4;

/**
 * @typedef {import("pg").Client & {
 *   __destroyed?: boolean,
 *   __expires?: number,
 *   __originalQuery?: (text: string, values?: unknown[]) => Promise<import("pg").QueryResult>,
 *   _queryable?: boolean,
 *   release?: (err?: unknown) => void,
 * }} LiveClient
 */

/**
 * @typedef {{ client: LiveClient, timer: NodeJS.Timeout }} WarmSlot
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
    code === "08000" ||
    code === "08001" ||
    code === "08003" ||
    code === "08006" ||
    code === "57P01"
  ) {
    return true;
  }
  return /timeout exceeded when trying to connect|Query read timeout|Connection terminated|socket hang up|read ETIMEDOUT|connect ETIMEDOUT|Connection ended unexpectedly/i.test(
    message,
  );
}

/**
 * @param {LiveClient} client
 * @param {WarmSlot[]} warm
 */
function destroyClient(client, warm) {
  if (!client || client.__destroyed) return;
  client.__destroyed = true;
  const index = warm.findIndex((item) => item.client === client);
  if (index >= 0) {
    clearTimeout(warm[index].timer);
    warm.splice(index, 1);
  }
  try {
    const stream = client.connection?.stream;
    if (stream && !stream.destroyed) stream.destroy();
  } catch {
    // Already gone.
  }
  try {
    client.end(() => {});
  } catch {
    // end() after a destroyed stream can throw; the socket is already dead.
  }
}

/**
 * @param {LiveClient} client
 * @param {string} text
 * @param {unknown[] | undefined} values
 * @param {number} ms
 * @param {WarmSlot[]} warm
 */
function queryDeadline(client, text, values, ms, warm) {
  const run = client.__originalQuery;
  if (!run) return Promise.reject(new Error("Postgres client is not open"));
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      const error = /** @type {Error & { code?: string }} */ (new Error("Query read timeout"));
      error.code = "ETIMEDOUT";
      destroyClient(client, warm);
      reject(error);
    }, ms);
    if (typeof timer.unref === "function") timer.unref();
    run(text, values).then(
      (res) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(res);
      },
      (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/**
 * Pool-shaped object: `connect()`, `query()`, `end()`. Connections are not
 * kept idle. A client released in the last {@link WARM_MS} may be reused so
 * one page does not pay a handshake per statement.
 *
 * @param {ReturnType<typeof postgresPoolConfig>} config
 */
export function createFreshPool(config) {
  /** @type {WarmSlot[]} */
  const warm = [];
  /** @type {Array<(err: Error) => void>} */
  const errorHandlers = [];

  /** @param {LiveClient} client */
  function drop(client) {
    destroyClient(client, warm);
  }

  async function openClient() {
    const client = /** @type {LiveClient} */ (
      new pg.Client({
        ...config,
        connectionTimeoutMillis: CONNECT_MS,
        query_timeout: QUERY_MS,
        keepAlive: true,
        keepAliveInitialDelayMillis: 1_000,
      })
    );
    client.on("error", (err) => {
      for (const handler of errorHandlers) {
        try {
          handler(err);
        } catch {
          // A listener must not crash the process.
        }
      }
      drop(client);
    });
    try {
      await client.connect();
    } catch (err) {
      drop(client);
      throw err;
    }
    if (!client.__originalQuery) {
      const original = client.query.bind(client);
      client.__originalQuery = (text, values) => original(text, values);
    }
    return client;
  }

  function takeWarm() {
    const now = Date.now();
    while (warm.length > 0) {
      const item = warm.pop();
      if (!item) break;
      clearTimeout(item.timer);
      const stream = item.client.connection?.stream;
      const alive =
        !item.client.__destroyed &&
        item.client._queryable !== false &&
        Boolean(stream) &&
        !stream.destroyed &&
        (item.client.__expires || 0) > now;
      if (alive) return item.client;
      drop(item.client);
    }
    return null;
  }

  /** @param {LiveClient} client */
  function park(client) {
    if (client.__destroyed || client._queryable === false) {
      drop(client);
      return;
    }
    while (warm.length >= WARM_MAX) {
      const old = warm.shift();
      if (!old) break;
      clearTimeout(old.timer);
      drop(old.client);
    }
    const timer = setTimeout(() => drop(client), WARM_MS);
    if (typeof timer.unref === "function") timer.unref();
    client.__expires = Date.now() + WARM_MS;
    warm.push({ client, timer });
  }

  /**
   * Kysely calls `client.query` itself, so the deadline has to live on the
   * client. The original method is kept so a warm client is not wrapped twice.
   * @param {LiveClient} client
   */
  function attachRelease(client) {
    let released = false;
    client.release = (err) => {
      if (released) return;
      released = true;
      if (err || client.__destroyed || client._queryable === false) drop(client);
      else park(client);
    };
    const original = client.__originalQuery;
    if (original) {
      const wrapped = /** @type {any} */ (client);
      wrapped.query = (/** @type {any} */ text, /** @type {any} */ values) => {
        if (typeof text !== "string") return original(text, values);
        return queryDeadline(client, text, values, QUERY_MS, warm);
      };
    }
    return client;
  }

  return {
    async connect() {
      let lastError;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const client = (attempt === 0 ? takeWarm() : null) || (await openClient());
          return attachRelease(client);
        } catch (err) {
          lastError = err;
          if (attempt === 0 && isTransientDbError(err)) {
            console.error("[db] connect failed, retrying:", /** @type {Error} */ (err)?.message || err);
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
          client = await this.connect();
          const result = await client.query(text, values);
          client.release?.();
          return result;
        } catch (err) {
          if (client) {
            try {
              client.release?.(err);
            } catch {
              drop(client);
            }
          }
          lastError = err;
          if (attempt === 0 && isTransientDbError(err)) {
            console.error("[db] query failed, retrying:", /** @type {Error} */ (err)?.message || err);
            continue;
          }
          throw err;
        }
      }
      throw lastError;
    },

    /** @param {string} event @param {(err: Error) => void} fn */
    on(event, fn) {
      if (event === "error" && typeof fn === "function") errorHandlers.push(fn);
      return this;
    },

    async end() {
      const leftover = warm.splice(0, warm.length);
      for (const item of leftover) {
        clearTimeout(item.timer);
        drop(item.client);
      }
    },
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
  const pool = prefersFreshConnections() ? createFreshPool(config) : createLongPool(config);
  if (prefersFreshConnections()) {
    console.log("[db] fresh connections (no idle pool). Set PG_POOL=1 to use a shared pool.");
  }
  globalRef.__appPgPool = pool;
  return pool;
}
