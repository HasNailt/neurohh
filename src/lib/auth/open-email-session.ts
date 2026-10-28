import { randomBytes } from "node:crypto";
import { createServerFn } from "@tanstack/react-start";
import { setCookie } from "@tanstack/react-start/server";
import { serializeSignedCookie } from "better-call";
import { getSql } from "@/lib/db";
import {
  DB_UNAVAILABLE,
  alignCredentialPassword,
  persistentDatabaseMissing,
} from "./credential-store.server";

const SESSION_COOKIE = "__Host-grok-auth.session_token";
const SESSION_SECONDS = 60 * 60 * 24 * 30;

export type OpenEmailSession =
  | { ok: true; token: string }
  | { ok: false; message: string };

const SOCIAL =
  "Для этого адреса пароль не задан. Войдите по email, для которого задавали пароль на сайте.";
const INVALID = "Неверный email или пароль";

/**
 * Sign in from the credential row itself. Better Auth reports
 * "invalid email or password" when the first credential row has no hash, or
 * when its query hides the password. If this scrypt matches, open a session
 * and return the raw token so the browser can keep it.
 */
export const openEmailSession = createServerFn({ method: "POST" })
  .validator((input: unknown): { email: string; password: string } => {
    const email =
      input && typeof input === "object" && "email" in input && typeof input.email === "string"
        ? input.email.trim().toLowerCase()
        : "";
    const password =
      input && typeof input === "object" && "password" in input && typeof input.password === "string"
        ? input.password
        : "";
    if (!email.includes("@") || email.length > 200) throw new Error("Проверьте email");
    if (password.length < 8 || password.length > 128) throw new Error("Пароль — минимум 8 символов");
    return { email, password };
  })
  .handler(async ({ data }): Promise<OpenEmailSession> => {
    if (persistentDatabaseMissing()) return { ok: false, message: DB_UNAVAILABLE };
    try {
      const aligned = await alignCredentialPassword(data.email, data.password);
      if (aligned.status !== "match" || !aligned.userId) {
        return { ok: false, message: aligned.status === "social" ? SOCIAL : INVALID };
      }
      const token = randomBytes(24).toString("hex");
      const id = randomBytes(16).toString("hex");
      const sql = await getSql();
      await sql`
        insert into "session" (id, "expiresAt", token, "createdAt", "updatedAt", "userId")
        values (${id}, now() + interval '30 days', ${token}, now(), now(), ${aligned.userId})
      `;

      const { auth } = await import("./server");
      const ctx = await auth.$context;
      const signed = await serializeSignedCookie(SESSION_COOKIE, token, ctx.secret);
      const pair = signed.split(";")[0] ?? "";
      const encoded = pair.startsWith(`${SESSION_COOKIE}=`)
        ? pair.slice(SESSION_COOKIE.length + 1)
        : "";
      let value = encoded;
      try {
        value = decodeURIComponent(encoded);
      } catch {
        value = encoded;
      }
      if (value) {
        setCookie(SESSION_COOKIE, value, {
          path: "/",
          httpOnly: true,
          secure: true,
          sameSite: "none",
          maxAge: SESSION_SECONDS,
          partitioned: true,
        });
      }
      return { ok: true, token };
    } catch (err) {
      console.error("[credential] open session failed", err);
      return { ok: false, message: INVALID };
    }
  });
