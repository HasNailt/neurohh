import assert from "node:assert/strict";
import test from "node:test";
import {
  isSupabaseUrl,
  postgresPoolConfig,
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

test("region builds the session pooler, not the transaction pooler", () => {
  const url = resolveDatabaseUrl({
    SUPABASE_URL: "https://abcdef.supabase.co",
    SUPABASE_DB_PASSWORD: "secret",
    SUPABASE_REGION: "eu-central-1",
  });
  assert.match(url, /postgres\.abcdef:secret@aws-0-eu-central-1\.pooler\.supabase\.com:5432/);
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

test("direct Supabase host is rewritten to the IPv4 pooler when the region is known", () => {
  const url = resolveDatabaseUrl({
    SUPABASE_DB_URL: "postgresql://postgres:pw@db.abcdef.supabase.co:5432/postgres",
    SUPABASE_REGION: "eu-central-1",
  });
  assert.match(url, /postgres\.abcdef:pw@aws-0-eu-central-1\.pooler\.supabase\.com:5432/);
  assert.match(url, /sslmode=require/);
});

test("transaction pooler port is rewritten to session mode", () => {
  const url = resolveDatabaseUrl({
    SUPABASE_DB_URL:
      "postgresql://postgres.abcdef:pw@aws-0-eu-central-1.pooler.supabase.com:6543/postgres",
  });
  assert.match(url, /:5432\//);
  assert.doesNotMatch(url, /:6543/);
});

test("the runtime pool stays small and times out instead of hanging", () => {
  const pool = postgresPoolConfig(supabaseUri, 5);
  assert.equal(pool.max, 2);
  assert.equal(pool.connectionTimeoutMillis, 8_000);
  assert.equal(pool.query_timeout, 10_000);
  assert.equal(pool.allowExitOnIdle, true);
  assert.equal(pool.keepAlive, true);
});

function withNoDoubleSsl(url) {
  return url;
}
