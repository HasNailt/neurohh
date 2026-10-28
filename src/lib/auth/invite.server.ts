import { APIError } from "better-auth/api";
import { getSql, type Sql } from "@/lib/db";

export const INVITE_COOKIE = "glyph-invite";

const CODE_RE = /^[A-Z0-9-]{6,32}$/;
const GATE_EMAIL = /@viewer\.grok\.invalid$/i;

const reservedByEmail = new Map<string, string>();

function cookieFrom(context: unknown): string {
  if (!context || typeof context !== "object") return "";
  const bag = context as {
    request?: Request;
    headers?: Headers;
    context?: { request?: Request; headers?: Headers };
  };
  if (bag.request instanceof Request) return bag.request.headers.get("cookie") ?? "";
  if (bag.headers instanceof Headers) return bag.headers.get("cookie") ?? "";
  if (bag.context?.request instanceof Request) return bag.context.request.headers.get("cookie") ?? "";
  if (bag.context?.headers instanceof Headers) return bag.context.headers.get("cookie") ?? "";
  return "";
}

export function normalizeInviteCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function readCookie(header: string, name: string): string | null {
  for (const part of header.split(";")) {
    const trimmed = part.trim();
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    if (trimmed.slice(0, eq) !== name) continue;
    try {
      return decodeURIComponent(trimmed.slice(eq + 1));
    } catch {
      return trimmed.slice(eq + 1);
    }
  }
  return null;
}

export async function inviteRequired(sql: Sql): Promise<boolean> {
  const rows = await sql<{ value: string }>`
    select value from site_settings where key = 'require_invite'
  `;
  return rows[0]?.value === "true";
}

async function userCount(sql: Sql): Promise<number> {
  const rows = await sql<{ n: number }>`select count(*)::int as n from "user"`;
  return num(rows[0]?.n);
}

/** Block a brand-new account when the admin has required an invite. */
export async function assertInviteAllowsSignup(email: string, context: unknown): Promise<void> {
  if (GATE_EMAIL.test(email)) return;
  let sql: Sql;
  try {
    sql = await getSql();
  } catch {
    return;
  }
  try {
    if ((await userCount(sql)) === 0) return;
    if (!(await inviteRequired(sql))) return;
    const code = normalizeInviteCode(readCookie(cookieFrom(context), INVITE_COOKIE) ?? "");
    if (!CODE_RE.test(code)) {
      throw new APIError("FORBIDDEN", { message: "Нужен инвайт-код" });
    }
    const updated = await sql<{ id: string }>`
      update invite_codes
      set uses = uses + 1
      where code = ${code} and revoked = false and uses < max_uses
      returning id
    `;
    if (!updated[0]) {
      throw new APIError("FORBIDDEN", { message: "Инвайт-код не подходит или уже использован" });
    }
    reservedByEmail.set(email.toLowerCase(), updated[0].id);
  } catch (err) {
    if (err instanceof APIError) throw err;
    console.error("[invite] check failed", err);
  }
}

export async function rememberInviteRedemption(email: string, userId: string): Promise<void> {
  const codeId = reservedByEmail.get(email.toLowerCase());
  reservedByEmail.delete(email.toLowerCase());
  if (!codeId) return;
  try {
    const sql = await getSql();
    await sql`
      insert into invite_redemptions (id, code_id, user_id)
      values (${crypto.randomUUID()}, ${codeId}, ${userId})
      on conflict (user_id) do nothing
    `;
  } catch (err) {
    console.error("[invite] redemption failed", err);
  }
}

