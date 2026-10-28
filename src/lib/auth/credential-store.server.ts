import { randomBytes } from "node:crypto";
import { resolveDatabaseUrl } from "../../../scripts/database-url.mjs";
import { getSql } from "@/lib/db";
import { hashPassword, verifyPassword } from "./password.server";

export const DB_UNAVAILABLE =
  "База данных не подключена, поэтому пароль негде сохранить. Подключите Supabase Postgres и опубликуйте сайт ещё раз.";

/** Deployed without a Postgres URI would use empty per-process PGLite and reject every later sign-in. */
export function persistentDatabaseMissing(): boolean {
  return process.env.VERCEL === "1" && !resolveDatabaseUrl();
}

type UserRow = { id: string; email: string };
type AccountRow = { id: string; password: string | null };

async function userByEmail(email: string): Promise<UserRow | null> {
  const sql = await getSql();
  const users = await sql<UserRow>`
    select id, email
    from "user"
    where lower(email) = ${email}
  `;
  return users.find((row) => row.email === email) ?? users[0] ?? null;
}

async function credentialAccounts(userId: string): Promise<AccountRow[]> {
  const sql = await getSql();
  return sql<AccountRow>`
    select id, password
    from account
    where "userId" = ${userId} and "providerId" = 'credential'
  `;
}

function hasHash(row: AccountRow): row is AccountRow & { password: string } {
  return typeof row.password === "string" && row.password.includes(":");
}

export type CredentialStatus = "match" | "miss" | "social" | "none";

/**
 * Sign-in reads the first credential row. An empty password there hides a
 * later row that has the real hash. When the submitted password matches any
 * stored hash, copy that hash onto every credential row and drop the blanks.
 * Never writes a password that did not already verify.
 */
export async function alignCredentialPassword(
  email: string,
  password: string,
): Promise<{ status: CredentialStatus; userId: string | null }> {
  const user = await userByEmail(email);
  if (!user) return { status: "none", userId: null };
  const sql = await getSql();
  if (user.email !== email) {
    await sql`
      update "user"
      set email = ${email}
      where id = ${user.id}
        and not exists (
          select 1 from "user" other where other.email = ${email} and other.id <> ${user.id}
        )
    `;
  }
  const accounts = await credentialAccounts(user.id);
  const hashed = accounts.filter(hasHash);
  if (hashed.length === 0) {
    return { status: accounts.length > 0 ? "social" : "none", userId: user.id };
  }
  let matching: string | null = null;
  for (const row of hashed) {
    if (await verifyPassword({ hash: row.password, password })) {
      matching = row.password.trim();
      break;
    }
  }
  if (!matching) return { status: "miss", userId: user.id };
  const drifted = hashed.some((row) => row.password.trim() !== matching);
  if (drifted) {
    await sql`
      update account
      set password = ${matching}, "updatedAt" = now()
      where "userId" = ${user.id} and "providerId" = 'credential'
    `;
  }
  if (accounts.length !== hashed.length) {
    await sql`
      delete from account
      where "userId" = ${user.id}
        and "providerId" = 'credential'
        and (password is null or length(password) = 0)
    `;
  }
  return { status: "match", userId: user.id };
}

/**
 * Right after sign-up, make sure `account.providerId = 'credential'` holds
 * this same scrypt hash. Only touches a user created in the last two minutes,
 * so a failed "email already exists" cannot overwrite someone else's password.
 */
export async function sealSignupPassword(userId: string, password: string): Promise<void> {
  if (!userId || password.length < 8) return;
  const sql = await getSql();
  const users = await sql<{ created_at: Date | string }>`
    select "createdAt" as created_at from "user" where id = ${userId} limit 1
  `;
  const created = users[0]?.created_at;
  if (!created) return;
  const age = Date.now() - new Date(created).getTime();
  if (!Number.isFinite(age) || age > 2 * 60 * 1000) return;
  const hash = await hashPassword(password);
  const existing = await sql<{ id: string }>`
    select id from account
    where "userId" = ${userId} and "providerId" = 'credential'
    limit 1
  `;
  if (!existing[0]) {
    const id = randomBytes(16).toString("hex");
    await sql`
      insert into account (
        id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt"
      ) values (
        ${id}, ${userId}, 'credential', ${userId}, ${hash}, now(), now()
      )
    `;
    return;
  }
  await sql`
    update account
    set password = ${hash}, "updatedAt" = now()
    where "userId" = ${userId} and "providerId" = 'credential'
  `;
}
