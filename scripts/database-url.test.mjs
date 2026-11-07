import assert from "node:assert/strict";
import test from "node:test";
import {
  isSupabaseUrl,
  postgresPoolConfig,
  prefersFreshConnections,
  resolveDatabaseUrl,
  resolveMigrationUrl,
  sessionSecretMaterial,
} from "./database-url.mjs";

const neon = "postgresql://neon:secret@ep-old.eu-central-1.aws.neon.tech/neondb";
const supabaseUri =
  "postgresql://postgres.abcdef:pw@aws-0-eu-central-1.pooler.supabase.com:5432/postgres";

test("Supabase URI wins over a platform DATABASE_URL", () => {
  const url = resolveDatabaseUrl({
    DATABASE_URL: neon,
    SUPABASE_DB_URL: supabaseUri,
  });
  assert.equal(url?.includes("pooler.supabase.com"), true);
  assert.equal(url?.includes("sslmode=require"), true);
  assert.equal(isSupabaseUrl(url), true);
});

test("POSTGRES_URL from the Supabase integration beats Neon", () => {
  const url = resolveDatabaseUrl({
    DATABASE_URL: neon,
    SUPABASE_URL: "https://abcdef.supabase.co",
    POSTGRES_URL: supabaseUri,
  });
  assert.match(url, /pooler\.supabase\.com/);
});

test("SUPABASE_URL plus password builds a direct connection", () => {
  const url = resolveDatabaseUrl({
    SUPABASE_URL: "https://abcdef.supabase.co",
    SUPABASE_DB_PASSWORD: "p@ss word",
    SUPABASE_SERVICE_ROLE_KEY: "service-token",
  });
  assert.match(url, /^postgresql:\/\/postgres:p%40ss%20word@db\.abcdef\.supabase\.co:5432\/postgres\?sslmode=require$/);
});

test("region builds the transaction pooler, not session mode", () => {
  const url = resolveDatabaseUrl({
    SUPABASE_URL: "https://abcdef.supabase.co",
    SUPABASE_DB_PASSWORD: "secret",
    SUPABASE_REGION: "eu-central-1",
  });
  assert.match(url, /postgres\.abcdef:secret@aws-0-eu-central-1\.pooler\.supabase\.com:6543/);
  assert.doesNotMatch(url, /:5432/);
});

test("blank DATABASE_URL is unset and falls through", () => {
  assert.equal(resolveDatabaseUrl({ DATABASE_URL: "   " }), undefined);
  assert.equal(resolveDatabaseUrl({ DATABASE_URL: neon }), withNoDoubleSsl(neon));
});

test("session material is the project URL, not the password", () => {
  const material = sessionSecretMaterial({
    SUPABASE_URL: "https://abcdef.supabase.co",
    SUPABASE_DB_URL: supabaseUri,
  });
  assert.equal(material, "https://abcdef.supabase.co");
});

test("migrations prefer the non-pooling URI", () => {
  const url = resolveMigrationUrl({
    POSTGRES_URL: supabaseUri,
    POSTGRES_URL_NON_POOLING: "postgresql://postgres:pw@db.abcdef.supabase.co:5432/postgres",
  });
  assert.match(url, /db\.abcdef\.supabase\.co/);
});

test("direct Supabase host is rewritten to the IPv4 transaction pooler when the region is known", () => {
  const url = resolveDatabaseUrl({
    SUPABASE_DB_URL: "postgresql://postgres:pw@db.abcdef.supabase.co:5432/postgres",
    SUPABASE_REGION: "eu-central-1",
  });
  assert.match(url, /postgres\.abcdef:pw@aws-0-eu-central-1\.pooler\.supabase\.com:6543/);
  assert.match(url, /sslmode=require/);
  assert.doesNotMatch(url, /:5432/);
});

test("session pooler port is rewritten to the transaction pooler", () => {
  const url = resolveDatabaseUrl({
    SUPABASE_DB_URL:
      "postgresql://postgres.abcdef:pw@aws-0-eu-central-1.pooler.supabase.com:5432/postgres",
  });
  assert.match(url, /:6543\//);
  assert.doesNotMatch(url, /:5432/);
});

test("transaction pooler port is left on 6543", () => {
  const url = resolveDatabaseUrl({
    SUPABASE_DB_URL:
      "postgresql://postgres.abcdef:pw@aws-0-eu-central-1.pooler.supabase.com:6543/postgres",
  });
  assert.match(url, /:6543\//);
  assert.doesNotMatch(url, /:5432/);
});

test("the runtime pool stays small and times out instead of hanging", () => {
  const pool = postgresPoolConfig(supabaseUri, 5);
  assert.equal(pool.max, 1);
  assert.equal(pool.connectionTimeoutMillis, 8_000);
  assert.equal(pool.query_timeout, 10_000);
  assert.equal(pool.allowExitOnIdle, true);
  assert.equal(pool.keepAlive, true);
});

test("fresh connections are the default, the shared pool is opt-in", () => {
  assert.equal(prefersFreshConnections({}), true);
  assert.equal(prefersFreshConnections({ DB_CONNECTION_MODE: "vps" }), true);
  assert.equal(prefersFreshConnections({ PG_FRESH: "1" }), true);
  assert.equal(prefersFreshConnections({ PG_POOL: "0" }), true);
  assert.equal(prefersFreshConnections({ PG_POOL: "1" }), false);
  assert.equal(prefersFreshConnections({ DB_CONNECTION_MODE: "pool" }), false);
  assert.equal(prefersFreshConnections({ PG_FRESH: "0" }), false);
});

function withNoDoubleSsl(url) {
  return url;
}
