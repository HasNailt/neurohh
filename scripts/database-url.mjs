/**
 * Where the app stores accounts, lots, bids, and chats.
 *
 * Supabase is Postgres. The server connects with `pg` (same driver as before),
 * never with the anon key in the browser. A new deploy keeps the data as long
 * as these variables stay pointed at the same Supabase project.
 *
 * Accepted (server-only, never VITE_):
 *   SUPABASE_DB_URL or SUPABASE_DATABASE_URL — Postgres URI from
 *     Supabase → Project Settings → Database → Connection string.
 *   SUPABASE_URL + SUPABASE_DB_PASSWORD — builds that URI when the full
 *     string is not set. Optional SUPABASE_REGION (pooler) or SUPABASE_DB_HOST.
 *   POSTGRES_URL / POSTGRES_URL_NON_POOLING / POSTGRES_PRISMA_URL — what the
 *     Vercel Supabase integration injects.
 *   SUPABASE_URL — stable project id. Session cookies are signed from it so a
 *     redeploy or a password rotation does not log everyone out.
 *   SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY — not used as the SQL
 *     password (they are API tokens). The service key must stay off the client.
 *   DATABASE_URL — fallback when no Supabase URI is configured.
 */

/** @param {NodeJS.ProcessEnv} env @param {string} key */
function read(env, key) {
  const value = env?.[key];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

/** @param {string} url */
function looksLikePostgres(url) {
  return /^postgres(ql)?:\/\//i.test(url);
}

/** @param {string} url */
export function isSupabaseUrl(url) {
  return /supabase\.(co|com)/i.test(url) || /pooler\.supabase\.com/i.test(url);
}

/** @param {string} url @param {boolean} force */
export function withSslMode(url, force) {
  if (!force || /[?&]sslmode=/i.test(url)) return url;
  return `${url}${url.includes("?") ? "&" : "?"}sslmode=require`;
}

/** @param {NodeJS.ProcessEnv} env @param {string[]} keys */
function firstPostgres(env, keys) {
  for (const key of keys) {
    const value = read(env, key);
    if (value && looksLikePostgres(value)) return value;
  }
  return undefined;
}

/** @param {string} supabaseUrl */
function projectRef(supabaseUrl) {
  try {
    const host = new URL(supabaseUrl).hostname.toLowerCase();
    const ref = host.split(".")[0];
    if (!ref || ref === "localhost" || ref === "supabase") return undefined;
    return ref;
  } catch {
    return undefined;
  }
}

/** @param {NodeJS.ProcessEnv} env */
function buildFromParts(env) {
  const password = read(env, "SUPABASE_DB_PASSWORD");
  const base = read(env, "SUPABASE_URL");
  if (!password || !base) return undefined;
  const ref = projectRef(base);
  if (!ref) return undefined;
  const encodedPass = encodeURIComponent(password);
  const hostOverride = read(env, "SUPABASE_DB_HOST");
  if (hostOverride) {
    const user = read(env, "SUPABASE_DB_USER") || `postgres.${ref}`;
    return `postgresql://${user}:${encodedPass}@${hostOverride.replace(/^https?:\/\//, "")}/postgres`;
  }
  const region = read(env, "SUPABASE_REGION");
  if (region) {
    // Session mode (5432) so node-postgres prepared statements survive the pooler.
    return `postgresql://postgres.${ref}:${encodedPass}@aws-0-${region}.pooler.supabase.com:5432/postgres`;
  }
  return `postgresql://postgres:${encodedPass}@db.${ref}.supabase.co:5432/postgres`;
}

/**
 * db.<ref>.supabase.co is often IPv6-only. Vercel is IPv4, so that host
 * hangs and the browser reports ERR_CONNECTION_RESET after ~30s. When the
 * region is known, use the IPv4 session pooler instead. Port 6543 is
 * transaction mode and breaks node-postgres prepared statements.
 * @param {string} url
 * @param {NodeJS.ProcessEnv} env
 */
export function rewriteSupabaseHost(url, env) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return url;
  }
  const direct = parsed.hostname.match(/^db\.([a-z0-9]+)\.supabase\.co$/i);
  const region = read(env, "SUPABASE_REGION");
  if (direct && region) {
    const ref = direct[1];
    if (decodeURIComponent(parsed.username) === "postgres") {
      parsed.username = `postgres.${ref}`;
    }
    parsed.hostname = `aws-0-${region}.pooler.supabase.com`;
    parsed.port = "5432";
  } else if (/pooler\.supabase\.com$/i.test(parsed.hostname) && parsed.port === "6543") {
    parsed.port = "5432";
  } else {
    return url;
  }
  return parsed.toString();
}

/** Runtime connection string. Supabase beats a platform DATABASE_URL. */
/** @param {NodeJS.ProcessEnv} [env] */
export function resolveDatabaseUrl(env = process.env) {
  const explicit = firstPostgres(env, ["SUPABASE_DB_URL", "SUPABASE_DATABASE_URL"]);
  const built = explicit ? undefined : buildFromParts(env);
  const postgresUrl =
    explicit || built
      ? undefined
      : firstPostgres(env, ["POSTGRES_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL_NON_POOLING"]);
  const databaseUrl = explicit || built || postgresUrl ? undefined : firstPostgres(env, ["DATABASE_URL"]);

  let chosen = explicit || built;
  if (!chosen && postgresUrl && (isSupabaseUrl(postgresUrl) || read(env, "SUPABASE_URL"))) {
    chosen = postgresUrl;
  }
  if (!chosen && databaseUrl) chosen = databaseUrl;
  if (!chosen && postgresUrl) chosen = postgresUrl;
  if (!chosen) return undefined;
  const rewritten = rewriteSupabaseHost(chosen, env);
  return withSslMode(rewritten, isSupabaseUrl(rewritten));
}

/** Migrations prefer a direct (non-pooled) URI when the host provides one. */
/** @param {NodeJS.ProcessEnv} [env] */
export function resolveMigrationUrl(env = process.env) {
  const direct = firstPostgres(env, ["POSTGRES_URL_NON_POOLING", "SUPABASE_DB_URL_NON_POOLING"]);
  if (direct) return withSslMode(direct, isSupabaseUrl(direct));
  return resolveDatabaseUrl(env);
}

/**
 * Stable across deploys. The project URL does not change when the host
 * rewrites the pooler string or the database password rotates.
 */
/** @param {NodeJS.ProcessEnv} [env] */
export function sessionSecretMaterial(env = process.env) {
  return read(env, "SUPABASE_URL") || resolveDatabaseUrl(env) || "";
}

/** @param {string} connectionString @param {number} [max] */
export function postgresPoolConfig(connectionString, max = 2) {
  const supabase = isSupabaseUrl(connectionString);
  return {
    connectionString: withSslMode(connectionString, supabase),
    // Keep this tiny. Each Vercel isolate used to open 10 clients and the
    // pooler then reset new connections after they waited half a minute.
    max: Math.min(Math.max(max, 1), 2),
    idleTimeoutMillis: 5_000,
    connectionTimeoutMillis: 8_000,
    query_timeout: 10_000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
    allowExitOnIdle: true,
    application_name: "adoptai",
    ...(supabase ? { ssl: { rejectUnauthorized: false } } : {}),
  };
}
