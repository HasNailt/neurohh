import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { getRequest } from "@tanstack/react-start/server";
import { getSql } from "@/lib/db";
import { SITE_ORIGIN } from "@/lib/site";
import { hashPassword } from "./password.server";
import { persistentDatabaseMissing, DB_UNAVAILABLE } from "./credential-store.server";

const RESEND_GAP_MS = 60 * 1000;

type Result = { ok: true } | { ok: false; message: string };

function mailConfig():
  | { kind: "resend"; key: string; from: string }
  | { kind: "smtp"; host: string; port: number; secure: boolean; user: string; pass: string; from: string }
  | null {
  const from = process.env.EMAIL_FROM?.trim() || "";
  const resend = process.env.RESEND_API_KEY?.trim() || "";
  if (resend && from) return { kind: "resend", key: resend, from };
  const host = process.env.SMTP_HOST?.trim() || "";
  const user = process.env.SMTP_USER?.trim() || "";
  const pass = process.env.SMTP_PASS?.trim() || "";
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = process.env.SMTP_SECURE === "1" || port === 465;
  if (host && user && pass && (from || user)) {
    return { kind: "smtp", host, port, secure, user, pass, from: from || user };
  }
  return null;
}

function origin(): string {
  try {
    const req = getRequest();
    const host = (req.headers.get("x-forwarded-host") || req.headers.get("host") || "").split(",")[0]?.trim() || "";
    const proto = (req.headers.get("x-forwarded-proto") || "https").split(",")[0]?.trim() || "https";
    if (host === "neurohh.ru" || host === "www.neurohh.ru") return SITE_ORIGIN;
    if (host.endsWith(".vercel.app") || host.startsWith("localhost") || host.startsWith("127.0.0.1")) {
      return `${proto}://${host}`;
    }
  } catch {
    /* no request scope */
  }
  return SITE_ORIGIN;
}

async function deliver(to: string, url: string): Promise<void> {
  const mail = mailConfig();
  if (!mail) throw new Error("Почта не настроена");
  const subject = "Сброс пароля AdoptAI";
  const text = [
    "Чтобы задать новый пароль, откройте ссылку.",
    "Она действует 1 час и только один раз.",
    "",
    url,
    "",
    "Если вы не запрашивали сброс, ничего делать не нужно.",
  ].join("\n");
  if (mail.kind === "resend") {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${mail.key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: mail.from, to: [to], subject, text }),
    });
    if (!res.ok) throw new Error("Не удалось отправить письмо");
    return;
  }
  const nodemailer = await import("nodemailer");
  const transport = nodemailer.createTransport({
    host: mail.host,
    port: mail.port,
    secure: mail.secure,
    auth: { user: mail.user, pass: mail.pass },
  });
  await transport.sendMail({ from: mail.from, to, subject, text });
}

function tokenHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function sameHash(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function requestPasswordResetEmail(email: string): Promise<Result> {
  if (persistentDatabaseMissing()) return { ok: false, message: DB_UNAVAILABLE };
  if (!mailConfig()) {
    return {
      ok: false,
      message: "Отправка писем не настроена. Добавьте SMTP или Resend в переменные окружения.",
    };
  }
  const sql = await getSql();
  const users = await sql<{ id: string }>`
    select id from "user" where lower(email) = ${email} limit 1
  `;
  const user = users[0];
  if (!user) return { ok: true };
  const identifier = `password-reset:${user.id}`;
  const recent = await sql<{ created_at: Date | string }>`
    select "createdAt" as created_at
    from verification
    where identifier = ${identifier} and "expiresAt" > now()
    order by "createdAt" desc
    limit 1
  `;
  const created = recent[0]?.created_at ? new Date(recent[0].created_at).getTime() : 0;
  if (created && Date.now() - created < RESEND_GAP_MS) return { ok: true };

  const token = randomBytes(32).toString("hex");
  const id = randomBytes(16).toString("hex");
  await sql`delete from verification where identifier = ${identifier}`;
  await sql`
    insert into verification (id, identifier, value, "expiresAt", "createdAt", "updatedAt")
    values (
      ${id},
      ${identifier},
      ${tokenHash(token)},
      now() + interval '1 hour',
      now(),
      now()
    )
  `;
  try {
    await deliver(email, `${origin()}/reset-password?token=${token}`);
  } catch {
    await sql`delete from verification where id = ${id}`;
    return { ok: false, message: "Не удалось отправить письмо. Проверьте настройки почты." };
  }
  return { ok: true };
}

export async function applyPasswordReset(token: string, password: string): Promise<Result> {
  if (persistentDatabaseMissing()) return { ok: false, message: DB_UNAVAILABLE };
  const sql = await getSql();
  const hash = tokenHash(token);
  const rows = await sql<{ id: string; identifier: string; value: string; expires_at: Date | string }>`
    select id, identifier, value, "expiresAt" as expires_at
    from verification
    where identifier like 'password-reset:%' and value = ${hash}
    limit 1
  `;
  const row = rows[0];
  if (!row || !sameHash(row.value, hash) || new Date(row.expires_at).getTime() <= Date.now()) {
    return { ok: false, message: "Ссылка недействительна или уже использована. Запросите новую." };
  }
  const userId = row.identifier.slice("password-reset:".length);
  if (!userId) return { ok: false, message: "Ссылка недействительна или уже использована. Запросите новую." };
  const passwordHash = await hashPassword(password);
  const updated = await sql<{ id: string }>`
    update account
    set password = ${passwordHash}, "updatedAt" = now()
    where "userId" = ${userId} and "providerId" = 'credential'
    returning id
  `;
  if (!updated[0]) {
    const accountId = randomBytes(16).toString("hex");
    await sql`
      insert into account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
      values (${accountId}, ${userId}, 'credential', ${userId}, ${passwordHash}, now(), now())
    `;
  }
  await sql`delete from "session" where "userId" = ${userId}`;
  await sql`delete from verification where identifier = ${row.identifier}`;
  return { ok: true };
}
