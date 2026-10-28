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

/** Runtime connection string. Supabase beats a platform DATABASE_URL. */
/** @param {NodeJS.ProcessEnv} [env] */
export function resolveDatabaseUrl(env = process.env) {
  const explicit = firstPostgres(env, ["SUPABASE_DB_URL", "SUPABASE_DATABASE_URL"]);
  if (explicit) return withSslMode(explicit, true);

  const built = buildFromParts(env);
  if (built) return withSslMode(built, true);

  const postgresUrl = firstPostgres(env, [
    "POSTGRES_URL",
    "POSTGRES_PRISMA_URL",
    "POSTGRES_URL_NON_POOLING",
  ]);
  if (postgresUrl && (isSupabaseUrl(postgresUrl) || read(env, "SUPABASE_URL"))) {
    return withSslMode(postgresUrl, isSupabaseUrl(postgresUrl));
  }

  const databaseUrl = firstPostgres(env, ["DATABASE_URL"]);
  if (databaseUrl) return withSslMode(databaseUrl, isSupabaseUrl(databaseUrl));

  if (postgresUrl) return withSslMode(postgresUrl, isSupabaseUrl(postgresUrl));
  return undefined;
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
export function postgresPoolConfig(connectionString, max = 5) {
  const supabase = isSupabaseUrl(connectionString);
  return {
    connectionString: withSslMode(connectionString, supabase),
    max,
    idleTimeoutMillis: 20_000,
    connectionTimeoutMillis: 15_000,
    allowExitOnIdle: true,
    ...(supabase ? { ssl: { rejectUnauthorized: false } } : {}),
  };
}
