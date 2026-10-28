import { createServerFn } from "@tanstack/react-start";
import { setCookie } from "@tanstack/react-start/server";
import { getSql } from "@/lib/db";

const INVITE_COOKIE = "glyph-invite";
const CODE_RE = /^[A-Z0-9-]{6,32}$/;

function normalizeInviteCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

/** Remember a code in an httpOnly cookie so the sign-up hook can consume it. */
export const stageInvite = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const raw =
      input && typeof input === "object" && "code" in input ? String((input as { code: unknown }).code ?? "") : "";
    const code = normalizeInviteCode(raw);
    if (!CODE_RE.test(code)) throw new Error("Некорректный инвайт-код");
    return { code };
  })
  .handler(async ({ data }) => {
    const sql = await getSql();
    const settings = await sql<{ value: string }>`
      select value from site_settings where key = 'require_invite'
    `;
    const required = settings[0]?.value === "true";
    if (!required) {
      setCookie(INVITE_COOKIE, "", { path: "/", maxAge: 0, httpOnly: true, sameSite: "lax", secure: true });
      return { ok: true as const, required: false };
    }
    const rows = await sql<{ id: string }>`
      select id from invite_codes
      where code = ${data.code} and revoked = false and uses < max_uses
    `;
    if (!rows[0]) throw new Error("Инвайт-код не подходит или уже использован");
    setCookie(INVITE_COOKIE, data.code, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      maxAge: 60 * 30,
    });
    return { ok: true as const, required: true };
  });
